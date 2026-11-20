import { isIntentTier, type IntentTier } from 'src/constants/intent-tier';
import type { LeadfeederClient } from 'src/sync/leadfeeder-client';
import { mapVisits } from 'src/sync/map-visit';
import { findCompany, planSync } from 'src/sync/plan-sync';
import {
  chunk,
  WRITE_CHUNK_SIZE,
  type TwentyRepository,
} from 'src/sync/twenty-repository';

const DAY_MS = 24 * 60 * 60 * 1000;

const SYNC_WINDOW_MS = 2 * DAY_MS;
const INITIAL_IMPORT_WINDOW_MS = 12 * 7 * DAY_MS;
const REVIEW_TASK_LOOKBACK_MS = 2 * DAY_MS;
// Each timeline entry is one API request; the app budget is 500 per minute.
const MAX_TIMELINE_ENTRIES_PER_RUN = 150;
// Longer than the function timeout, so a crashed run never blocks for long.
const LOCK_DURATION_MS = 5 * 60 * 1000;
// Time to let a concurrent run's lock write land before checking ownership.
const LOCK_SETTLE_MS = 500;

export type SyncLock = { lockedUntil: string; owner: string };

export type LastSuccessfulSync = {
  finishedAt: string;
  windowStart: string;
  windowEnd: string;
};

export type SyncState = {
  getLastReviewTaskAt: (leadfeederCompanyId: string) => Promise<string | null>;
  setLastReviewTaskAt: (
    leadfeederCompanyId: string,
    createdAt: string,
  ) => Promise<void>;
  getLastSuccessfulSync: () => Promise<LastSuccessfulSync | null>;
  setLastSuccessfulSync: (value: LastSuccessfulSync) => Promise<void>;
  isInitialImportDone: () => Promise<boolean>;
  markInitialImportDone: () => Promise<void>;
  getLock: () => Promise<SyncLock | null>;
  setLock: (lock: SyncLock | null) => Promise<void>;
};

export type RunSyncDependencies = {
  leadfeeder: LeadfeederClient;
  twenty: TwentyRepository;
  state: SyncState;
  threshold: IntentTier;
  closedOpportunityStages: string[];
  excludedLeadfeederCompanyIds: string[];
  now: Date;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const toDate = (date: Date) => date.toISOString().slice(0, 10);

export const parseThreshold = (value: string | undefined): IntentTier => {
  const normalized = value?.trim().toLowerCase();

  return isIntentTier(normalized) ? normalized : 'high';
};

export const parseList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

// The first successful run imports the last 12 weeks. Later runs read the
// last 48 hours, or from the day before the last successful window ended if
// that is earlier (after an outage), never more than 12 weeks back.
export const syncWindowStart = ({
  isInitialImport,
  lastSuccessfulSync,
  now,
}: {
  isInitialImport: boolean;
  lastSuccessfulSync: LastSuccessfulSync | null;
  now: Date;
}): string => {
  const earliest = now.getTime() - INITIAL_IMPORT_WINDOW_MS;
  const regular = now.getTime() - SYNC_WINDOW_MS;

  if (isInitialImport) {
    return toDate(new Date(earliest));
  }

  const resumeFrom = lastSuccessfulSync
    ? Date.parse(lastSuccessfulSync.windowEnd) - DAY_MS
    : Number.NaN;
  const start = Number.isNaN(resumeFrom)
    ? regular
    : Math.max(earliest, Math.min(regular, resumeFrom));

  return toDate(new Date(start));
};

// A lease in the key-value store keeps a manual run and the hourly run from
// overlapping, which could otherwise duplicate timeline entries or tasks.
// The store has no atomic compare-and-set, so a run writes its own owner
// token, waits briefly and only continues if the token is still its own.
export const runSync = async (dependencies: RunSyncDependencies) => {
  const { state, now, sleep = defaultSleep } = dependencies;
  const current = await state.getLock();

  if (current && Date.parse(current.lockedUntil) > now.getTime()) {
    return { skipped: true, lockedUntil: current.lockedUntil };
  }

  const lock: SyncLock = {
    lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS).toISOString(),
    owner: crypto.randomUUID(),
  };

  await state.setLock(lock);
  await sleep(LOCK_SETTLE_MS);

  const confirmed = await state.getLock();

  if (confirmed?.owner !== lock.owner) {
    return { skipped: true, lockedUntil: confirmed?.lockedUntil ?? null };
  }

  try {
    return await sync(dependencies);
  } finally {
    try {
      if ((await state.getLock())?.owner === lock.owner) {
        await state.setLock(null);
      }
    } catch (error) {
      console.error(
        `Could not release the sync lock: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
};

// Review tasks only consider visits of the last 48 hours, so imports of older
// visits never create tasks.
//
// Everything is read before the first write, so a failing Leadfeeder or read
// call leaves no data behind. Writes are idempotent: a rerun after a partial
// write skips stored visits, adds missing timeline entries, recomputes company
// fields and skips review tasks that are still open.
const sync = async ({
  leadfeeder,
  twenty,
  state,
  threshold,
  closedOpportunityStages,
  excludedLeadfeederCompanyIds,
  now,
}: RunSyncDependencies) => {
  const isInitialImport = !(await state.isInitialImportDone());
  const windowStart = syncWindowStart({
    isInitialImport,
    lastSuccessfulSync: await state.getLastSuccessfulSync(),
    now,
  });
  const windowEnd = toDate(now);
  const reviewTaskSince = new Date(now.getTime() - REVIEW_TASK_LOOKBACK_MS);
  const rawVisits = await leadfeeder.searchWebVisits({
    startDate: windowStart,
    endDate: windowEnd,
  });
  const { visits: mappedVisits, skipped: skippedVisits } = mapVisits(rawVisits);
  const visits = mappedVisits.filter(
    (visit) => !excludedLeadfeederCompanyIds.includes(visit.leadfeederCompanyId),
  );

  const companiesByDomain = await twenty.findCompaniesByDomains([
    ...new Set(visits.flatMap((visit) => visit.domains)),
  ]);
  const existingVisits = await twenty.findExistingVisits(
    visits.map((visit) => visit.leadfeederVisitId),
  );
  const matchedCompanyIds = [
    ...new Set(
      visits
        .map((visit) => findCompany(visit, companiesByDomain)?.id)
        .filter((id): id is string => id !== undefined),
    ),
  ];
  const companyIdsWithOpenOpportunity =
    await twenty.findCompanyIdsWithOpenOpportunity(
      matchedCompanyIds,
      closedOpportunityStages,
    );

  const lastReviewTaskAt = new Map<string, string>();

  for (const leadfeederCompanyId of new Set(
    visits
      .filter((visit) => new Date(visit.visitedAt) >= reviewTaskSince)
      .map((visit) => visit.leadfeederCompanyId),
  )) {
    const createdAt = await state.getLastReviewTaskAt(leadfeederCompanyId);

    if (createdAt) {
      lastReviewTaskAt.set(leadfeederCompanyId, createdAt);
    }
  }

  const plan = planSync({
    visits,
    companiesByDomain,
    existingVisitIds: new Set(existingVisits.keys()),
    companyIdsWithOpenOpportunity,
    lastReviewTaskAt,
    reviewTaskSince,
    threshold,
    now,
  });
  const openTaskTitles = await twenty.findOpenTaskTitles(
    plan.reviewTasks.map((task) => task.title),
  );
  // Two Leadfeeder companies can share a name: one open task per title.
  const reviewTasks = plan.reviewTasks.filter(
    (task, index, all) =>
      !openTaskTitles.has(task.title) &&
      all.findIndex((other) => other.title === task.title) === index,
  );
  // Only stored visits can have timeline entries, so this is the last read
  // before the first write.
  const visitIdsWithTimelineEntry = await twenty.findVisitIdsWithTimelineEntry([
    ...existingVisits.values(),
  ]);

  const createdVisits = await twenty.createWebsiteVisits(plan.visitsToCreate);
  const visitRecordIds = new Map([...existingVisits, ...createdVisits]);
  const timelineCandidates = plan.timelineEntries
    .map((entry) => ({
      ...entry,
      visitRecordId: visitRecordIds.get(entry.leadfeederVisitId),
    }))
    .filter(
      (entry): entry is typeof entry & { visitRecordId: string } =>
        entry.visitRecordId !== undefined,
    );
  const missingTimelineEntries = timelineCandidates.filter(
    (entry) => !visitIdsWithTimelineEntry.has(entry.visitRecordId),
  );
  const timelineEntriesThisRun = missingTimelineEntries.slice(
    0,
    MAX_TIMELINE_ENTRIES_PER_RUN,
  );
  const remainingTimelineEntries =
    missingTimelineEntries.length - timelineEntriesThisRun.length;

  await twenty.createTimelineEntries(timelineEntriesThisRun);
  await twenty.updateCompanies(plan.companyUpdates);

  for (const taskChunk of chunk(reviewTasks, WRITE_CHUNK_SIZE)) {
    await twenty.createReviewTasks(taskChunk);

    for (const task of taskChunk) {
      await state.setLastReviewTaskAt(task.leadfeederCompanyId, now.toISOString());
    }
  }

  // The window is kept until every timeline entry exists, so the hourly runs
  // finish a large import before moving on.
  const isComplete = remainingTimelineEntries === 0;

  if (isComplete) {
    if (isInitialImport) {
      await state.markInitialImportDone();
    }

    await state.setLastSuccessfulSync({
      finishedAt: new Date().toISOString(),
      windowStart,
      windowEnd,
    });
  }

  return {
    isInitialImport,
    windowStart,
    fetchedVisits: rawVisits.length,
    skippedVisits,
    ignoredVisits: mappedVisits.length - visits.length,
    matchedDomains: companiesByDomain.size,
    createdVisits: plan.visitsToCreate.length,
    createdTimelineEntries: timelineEntriesThisRun.length,
    remainingTimelineEntries,
    updatedCompanies: plan.companyUpdates.length,
    createdReviewTasks: reviewTasks.length,
    skippedBelowThreshold: plan.unmatchedBelowThreshold,
  };
};
