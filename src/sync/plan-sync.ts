import {
  isAtOrAboveThreshold,
  toIntentTierOption,
  type IntentTier,
  type IntentTierOption,
} from 'src/constants/intent-tier';
import { REVIEW_TASK_TITLE_PREFIX } from 'src/constants/review-task';
import { FORM_SUBMITTED_PREFIX, type Visit } from 'src/sync/map-visit';

const REVIEW_TASK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export type TwentyCompany = {
  id: string;
  name: string;
  domain: string;
  leadfeederCompanyId: string | null;
  leadfeederIntentScore: number | null;
  leadfeederIntentTier: string | null;
  lastWebsiteVisit: string | null;
};

export type WebsiteVisitInput = {
  name: string;
  position: number;
  leadfeederVisitId: string;
  companyId: string;
  visitedAt: string;
  landingPage: string | null;
  pages: string;
  pageDepth: number | null;
  durationSeconds: number | null;
  formSubmitted: boolean;
  visitLocation: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referringUrl: string | null;
  intentScore: number | null;
  intentTier: IntentTierOption | null;
  hasOpenOpportunity: boolean;
  leadfeederLink: { primaryLinkUrl: string; primaryLinkLabel: string } | null;
};

export type TimelineEntry = {
  leadfeederVisitId: string;
  companyId: string;
  happensAt: string;
  properties: {
    landingPage: string | null;
    pages: string[];
    pageDepth: number | null;
    durationSeconds: number | null;
    formSubmitted: boolean;
    visitLocation: string | null;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    intentScore: number | null;
    intentTier: IntentTier | null;
  };
};

export type CompanyUpdate = {
  id: string;
  leadfeederCompanyId: string;
  leadfeederIntentScore: number | null;
  leadfeederIntentTier: IntentTierOption | null;
  lastWebsiteVisit: string;
};

export type ReviewTask = {
  leadfeederCompanyId: string;
  title: string;
  markdown: string;
};

type SyncPlan = {
  visitsToCreate: WebsiteVisitInput[];
  timelineEntries: TimelineEntry[];
  companyUpdates: CompanyUpdate[];
  reviewTasks: ReviewTask[];
  unmatchedBelowThreshold: number;
};

type PlanSyncInput = {
  visits: Visit[];
  companiesByDomain: Map<string, TwentyCompany>;
  existingVisitIds: Set<string>;
  companyIdsWithOpenOpportunity: Set<string>;
  lastReviewTaskAt: Map<string, string>;
  reviewTaskSince: Date;
  threshold: IntentTier;
  now: Date;
};

export const findCompany = (
  visit: Visit,
  companiesByDomain: Map<string, TwentyCompany>,
) =>
  visit.domains
    .map((domain) => companiesByDomain.get(domain))
    .find((company) => company !== undefined);

const latestVisit = (visits: Visit[]) =>
  visits.reduce((latest, visit) =>
    visit.visitedAt > latest.visitedAt ? visit : latest,
  );

const visitName = (visit: Visit, company: TwentyCompany) =>
  `${company.name} · ${visit.landingPage ?? '/'}`.slice(0, 200);

const toVisitInput = (
  visit: Visit,
  company: TwentyCompany,
  hasOpenOpportunity: boolean,
): WebsiteVisitInput => ({
  name: visitName(visit, company),
  // Relation lists show the highest position first: newest visit on top.
  position: Math.floor(new Date(visit.visitedAt).getTime() / 1000),
  leadfeederVisitId: visit.leadfeederVisitId,
  companyId: company.id,
  visitedAt: visit.visitedAt,
  landingPage: visit.landingPage,
  pages: visit.pages,
  pageDepth: visit.pageDepth,
  durationSeconds: visit.durationSeconds,
  formSubmitted: visit.formSubmitted,
  visitLocation: visit.visitLocation,
  source: visit.source,
  medium: visit.medium,
  campaign: visit.campaign,
  referringUrl: visit.referringUrl,
  intentScore: visit.intentScore,
  intentTier: toIntentTierOption(visit.intentTier),
  hasOpenOpportunity,
  leadfeederLink: visit.leadfeederUrl
    ? { primaryLinkUrl: visit.leadfeederUrl, primaryLinkLabel: 'Leadfeeder' }
    : null,
});

const toTimelineEntry = (
  visit: Visit,
  company: TwentyCompany,
): TimelineEntry => ({
  leadfeederVisitId: visit.leadfeederVisitId,
  companyId: company.id,
  happensAt: visit.visitedAt,
  properties: {
    landingPage: visit.landingPage,
    pages: visit.pageList,
    pageDepth: visit.pageDepth,
    durationSeconds: visit.durationSeconds,
    formSubmitted: visit.formSubmitted,
    visitLocation: visit.visitLocation,
    source: visit.source,
    medium: visit.medium,
    campaign: visit.campaign,
    intentScore: visit.intentScore,
    intentTier: visit.intentTier,
  },
});

const toCompanyUpdate = (
  company: TwentyCompany,
  visits: Visit[],
): CompanyUpdate | null => {
  const latest = latestVisit(visits);
  const lastWebsiteVisit =
    company.lastWebsiteVisit &&
    new Date(company.lastWebsiteVisit).getTime() >
      new Date(latest.visitedAt).getTime()
      ? new Date(company.lastWebsiteVisit).toISOString()
      : latest.visitedAt;
  const update: CompanyUpdate = {
    id: company.id,
    leadfeederCompanyId: latest.leadfeederCompanyId,
    leadfeederIntentScore: latest.intentScore,
    leadfeederIntentTier: toIntentTierOption(latest.intentTier),
    lastWebsiteVisit,
  };
  const isUnchanged =
    company.leadfeederCompanyId === update.leadfeederCompanyId &&
    company.leadfeederIntentScore === update.leadfeederIntentScore &&
    company.leadfeederIntentTier === update.leadfeederIntentTier &&
    company.lastWebsiteVisit !== null &&
    new Date(company.lastWebsiteVisit).getTime() ===
      new Date(update.lastWebsiteVisit).getTime();

  return isUnchanged ? null : update;
};

const formatBerlinTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso));

const toReviewTask = (visits: Visit[]): ReviewTask => {
  const latest = latestVisit(visits);
  const landingPages = [
    ...new Set(visits.map((visit) => visit.landingPage ?? '/')),
  ];
  const formSubmission = visits
    .filter((visit) => visit.formSubmitted)
    .reduce<Visit | null>(
      (latestForm, visit) =>
        !latestForm || visit.visitedAt > latestForm.visitedAt ? visit : latestForm,
      null,
    );
  const lines = [
    `**${latest.companyName}** visited the website but does not exist in Twenty (no company with a matching domain).`,
    ...(formSubmission
      ? [
          '',
          `**${formSubmission.pageList.find((line) => line.startsWith(FORM_SUBMITTED_PREFIX)) ?? 'Form submitted'}** (${formatBerlinTime(formSubmission.visitedAt)}).`,
        ]
      : []),
    '',
    `- Intent: ${latest.intentScore ?? '–'} (${latest.intentTier ?? 'unknown'})`,
    `- Domain: ${latest.domains[0] ?? 'unknown'}`,
    `- Last visit: ${formatBerlinTime(latest.visitedAt)}`,
    `- Landing pages: ${landingPages.join(', ')}`,
    ...(latest.visitLocation ? [`- Visit location: ${latest.visitLocation}`] : []),
  ];

  if (latest.leadfeederUrl) {
    lines.push('', `[Open in Leadfeeder](${latest.leadfeederUrl})`);
  }

  const domainHint = latest.domains[0]
    ? ` with the domain ${latest.domains[0]}`
    : ' with its website domain';

  lines.push(
    '',
    `**Next step:** if the company is relevant, create it in Twenty${domainHint}. Its future visits then appear in Twenty automatically. Close this task when done.`,
  );

  return {
    leadfeederCompanyId: latest.leadfeederCompanyId,
    title: `${REVIEW_TASK_TITLE_PREFIX}: ${latest.companyName}`,
    markdown: lines.join('\n'),
  };
};

const groupBy = <T>(items: T[], key: (item: T) => string) => {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  }

  return groups;
};

export const planSync = ({
  visits,
  companiesByDomain,
  existingVisitIds,
  companyIdsWithOpenOpportunity,
  lastReviewTaskAt,
  reviewTaskSince,
  threshold,
  now,
}: PlanSyncInput): SyncPlan => {
  const matched: { visit: Visit; company: TwentyCompany }[] = [];
  const unmatched: Visit[] = [];

  for (const visit of visits) {
    const company = findCompany(visit, companiesByDomain);

    if (company) {
      matched.push({ visit, company });
    } else {
      unmatched.push(visit);
    }
  }

  const visitsToCreate = matched
    .filter(({ visit }) => !existingVisitIds.has(visit.leadfeederVisitId))
    .map(({ visit, company }) =>
      toVisitInput(
        visit,
        company,
        companyIdsWithOpenOpportunity.has(company.id),
      ),
    );

  const timelineEntries = matched.map(({ visit, company }) =>
    toTimelineEntry(visit, company),
  );

  const companyUpdates = [
    ...groupBy(matched, ({ company }) => company.id).values(),
  ]
    .map((group) =>
      toCompanyUpdate(
        group[0].company,
        group.map(({ visit }) => visit),
      ),
    )
    .filter((update): update is CompanyUpdate => update !== null);

  const unmatchedByCompany = groupBy(
    unmatched.filter((visit) => new Date(visit.visitedAt) >= reviewTaskSince),
    (visit) => visit.leadfeederCompanyId,
  );
  const reviewTasks: ReviewTask[] = [];
  let unmatchedBelowThreshold = 0;

  // A form submission is the clearest buying signal, so it creates a task
  // whatever the intent tier.
  for (const [leadfeederCompanyId, companyVisits] of unmatchedByCompany) {
    const { intentTier } = latestVisit(companyVisits);
    const hasFormSubmission = companyVisits.some((visit) => visit.formSubmitted);

    if (!hasFormSubmission && !isAtOrAboveThreshold(intentTier, threshold)) {
      unmatchedBelowThreshold++;
      continue;
    }

    const lastTaskAt = lastReviewTaskAt.get(leadfeederCompanyId);
    const isRecent =
      lastTaskAt !== undefined &&
      now.getTime() - new Date(lastTaskAt).getTime() < REVIEW_TASK_INTERVAL_MS;
    if (!isRecent) {
      reviewTasks.push(toReviewTask(companyVisits));
    }
  }

  return {
    visitsToCreate,
    timelineEntries,
    companyUpdates,
    reviewTasks,
    unmatchedBelowThreshold,
  };
};
