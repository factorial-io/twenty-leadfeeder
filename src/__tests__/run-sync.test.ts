import { describe, expect, it } from 'vitest';

import { leadfeederVisit } from 'src/__tests__/fixtures';
import { normalizeDomain } from 'src/sync/domain';
import {
  LeadfeederApiError,
  type LeadfeederClient,
  type LeadfeederWebVisit,
} from 'src/sync/leadfeeder-client';
import type {
  CompanyUpdate,
  ReviewTask,
  TimelineEntry,
  TwentyCompany,
  WebsiteVisitInput,
} from 'src/sync/plan-sync';
import {
  parseList,
  parseThreshold,
  runSync,
  syncWindowStart,
  type LastSuccessfulSync,
  type SyncLock,
  type SyncState,
} from 'src/sync/run-sync';
import type { TwentyRepository } from 'src/sync/twenty-repository';

const NOW = new Date('2026-11-06T12:00:00.000Z');

type StoredVisit = WebsiteVisitInput & { id: string };

const createFakeWorkspace = (
  companies: TwentyCompany[],
  opportunities: { companyId: string; stage: string }[] = [],
) => {
  const state = {
    companies: new Map(companies.map((company) => [company.id, { ...company }])),
    visits: [] as StoredVisit[],
    timeline: [] as (TimelineEntry & { visitRecordId: string })[],
    tasks: [] as (ReviewTask & { status: string })[],
    taskBatchSizes: [] as number[],
    kv: new Map<string, unknown>(),
    failTimelineOnce: false,
  };

  const twenty: TwentyRepository = {
    findCompaniesByDomains: async (domains) =>
      new Map(
        [...state.companies.values()]
          .filter((company) => domains.includes(normalizeDomain(company.domain)!))
          .map((company) => [normalizeDomain(company.domain)!, company]),
      ),
    findExistingVisits: async (ids) =>
      new Map(
        state.visits
          .filter((visit) => ids.includes(visit.leadfeederVisitId))
          .map((visit) => [visit.leadfeederVisitId, visit.id]),
      ),
    findCompanyIdsWithOpenOpportunity: async (companyIds, closedStages) =>
      new Set(
        opportunities
          .filter(
            (opportunity) =>
              companyIds.includes(opportunity.companyId) &&
              !closedStages.includes(opportunity.stage),
          )
          .map((opportunity) => opportunity.companyId),
      ),
    createWebsiteVisits: async (visits) => {
      const created = new Map<string, string>();

      for (const visit of visits) {
        if (state.visits.some((v) => v.leadfeederVisitId === visit.leadfeederVisitId)) {
          throw new Error('unique constraint violated');
        }
        const id = `record-${visit.leadfeederVisitId}`;
        state.visits.push({ ...visit, id });
        created.set(visit.leadfeederVisitId, id);
      }

      return created;
    },
    findVisitIdsWithTimelineEntry: async (visitRecordIds) =>
      new Set(
        state.timeline
          .map((entry) => entry.visitRecordId)
          .filter((id) => visitRecordIds.includes(id)),
      ),
    createTimelineEntries: async (entries) => {
      if (state.failTimelineOnce) {
        state.failTimelineOnce = false;
        throw new Error('timeline write failed');
      }
      state.timeline.push(...entries);
    },
    updateCompanies: async (updates: CompanyUpdate[]) => {
      for (const { id, ...fields } of updates) {
        Object.assign(state.companies.get(id)!, fields);
      }
    },
    findOpenTaskTitles: async (titles) =>
      new Set(
        state.tasks
          .filter((task) => task.status !== 'DONE' && titles.includes(task.title))
          .map((task) => task.title),
      ),
    createReviewTasks: async (tasks) => {
      state.taskBatchSizes.push(tasks.length);
      state.tasks.push(...tasks.map((task) => ({ ...task, status: 'TODO' })));
    },
  };

  const syncState: SyncState = {
    getLastReviewTaskAt: async (key) =>
      (state.kv.get(`review-task:${key}`) as string | undefined) ?? null,
    setLastReviewTaskAt: async (key, value) => {
      state.kv.set(`review-task:${key}`, value);
    },
    getLastSuccessfulSync: async () =>
      (state.kv.get('sync:last-success') as LastSuccessfulSync | undefined) ?? null,
    setLastSuccessfulSync: async (value) => {
      state.kv.set('sync:last-success', value);
    },
    getLock: async () => (state.kv.get('sync:lock') as SyncLock | undefined) ?? null,
    setLock: async (lock) => {
      if (lock) {
        state.kv.set('sync:lock', lock);
      } else {
        state.kv.delete('sync:lock');
      }
    },
    isInitialImportDone: async () => state.kv.get('sync:initial-import-done') === true,
    markInitialImportDone: async () => {
      state.kv.set('sync:initial-import-done', true);
    },
  };

  return { state, twenty, syncState };
};

const leadfeederReturning = (
  result: LeadfeederWebVisit[] | Error,
): LeadfeederClient => ({
  listAccountIds: async () => ['123456'],
  searchWebVisits: async () => {
    if (result instanceof Error) {
      throw result;
    }
    return result;
  },
});

const company = (id: string, domain: string): TwentyCompany => ({
  id,
  name: id,
  domain,
  leadfeederCompanyId: null,
  leadfeederIntentScore: null,
  leadfeederIntentTier: null,
  lastWebsiteVisit: null,
});

const visits = [
  leadfeederVisit({ id: 'v1', companyId: 'lf-acme', url: 'https://www.acme.de' }),
  leadfeederVisit({ id: 'v2', companyId: 'lf-acme', url: 'https://www.acme.de', startedAt: '2026-11-06T11:00:00.000Z' }),
  leadfeederVisit({ id: 'v3', companyId: 'lf-new', name: 'New Co', url: 'https://new.example', tier: 'high' }),
  leadfeederVisit({ id: 'v4', companyId: 'lf-low', name: 'Low Co', url: 'https://low.example', tier: 'low' }),
];

const deps = (workspace: ReturnType<typeof createFakeWorkspace>, result: LeadfeederWebVisit[] | Error = visits) => ({
  twenty: workspace.twenty,
  state: workspace.syncState,
  leadfeeder: leadfeederReturning(result),
  threshold: 'high' as const,
  closedOpportunityStages: ['CLOSED_WON', 'CLOSED_LOST'],
  excludedLeadfeederCompanyIds: [] as string[],
  now: NOW,
  sleep: async () => {},
});

describe('runSync', () => {
  it('imports matched visits with timeline entries, creates review tasks and is idempotent', async () => {
    const workspace = createFakeWorkspace(
      [company('acme', 'https://acme.de')],
      [{ companyId: 'acme', stage: 'PROPOSAL' }],
    );

    const first = await runSync(deps(workspace));
    const second = await runSync(deps(workspace));

    expect(first).toMatchObject({
      createdVisits: 2,
      createdTimelineEntries: 2,
      updatedCompanies: 1,
      createdReviewTasks: 1,
      skippedBelowThreshold: 1,
    });
    expect(second).toMatchObject({
      createdVisits: 0,
      createdTimelineEntries: 0,
      updatedCompanies: 0,
      createdReviewTasks: 0,
    });
    expect(workspace.state.visits).toHaveLength(2);
    expect(workspace.state.visits.every((visit) => visit.hasOpenOpportunity)).toBe(true);
    expect(workspace.state.timeline.map((entry) => [entry.visitRecordId, entry.companyId, entry.happensAt])).toEqual([
      ['record-v1', 'acme', '2026-11-06T10:00:00.000Z'],
      ['record-v2', 'acme', '2026-11-06T11:00:00.000Z'],
    ]);
    expect(workspace.state.tasks.map((task) => task.title)).toEqual(['Review website visitor: New Co']);
    expect(workspace.state.kv.get('review-task:lf-new')).toBe(NOW.toISOString());
    expect(first).toMatchObject({ isInitialImport: true, windowStart: '2026-08-14' });
    expect(second).toMatchObject({ isInitialImport: false, windowStart: '2026-11-04' });
    expect(workspace.state.kv.get('sync:last-success')).toMatchObject({
      windowStart: '2026-11-04',
      windowEnd: '2026-11-06',
    });
    expect(workspace.state.companies.get('acme')).toMatchObject({
      leadfeederCompanyId: 'lf-acme',
      leadfeederIntentTier: 'HIGH',
      lastWebsiteVisit: '2026-11-06T11:00:00.000Z',
    });
  });

  it('adds missing timeline entries on the next run after a partial failure', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);
    workspace.state.failTimelineOnce = true;

    await expect(runSync(deps(workspace))).rejects.toThrow('timeline write failed');
    expect(workspace.state.visits).toHaveLength(2);
    expect(workspace.state.timeline).toHaveLength(0);
    expect(workspace.state.kv.has('sync:last-success')).toBe(false);

    const rerun = await runSync(deps(workspace));

    expect(rerun).toMatchObject({ createdVisits: 0, createdTimelineEntries: 2 });
    expect(workspace.state.timeline).toHaveLength(2);
  });

  it('asks Leadfeeder for 12 weeks until an initial import succeeded', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);
    const windows: string[] = [];
    const leadfeeder: LeadfeederClient = {
      listAccountIds: async () => [],
      searchWebVisits: async ({ startDate, endDate }) => {
        windows.push(`${startDate}..${endDate}`);
        if (windows.length === 1) {
          throw new LeadfeederApiError('boom', 500);
        }
        return visits;
      },
    };

    await expect(runSync({ ...deps(workspace), leadfeeder })).rejects.toThrow('boom');
    await runSync({ ...deps(workspace), leadfeeder });
    await runSync({ ...deps(workspace), leadfeeder });

    expect(windows).toEqual([
      '2026-08-14..2026-11-06',
      '2026-08-14..2026-11-06',
      '2026-11-04..2026-11-06',
    ]);
  });

  it('spreads a large initial import over several runs', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);
    const many = Array.from({ length: 160 }, (_, index) =>
      leadfeederVisit({
        id: `bulk-${index}`,
        companyId: 'lf-acme',
        url: 'https://acme.de',
        startedAt: new Date(NOW.getTime() - index * 3600 * 1000).toISOString(),
      }),
    );

    const first = await runSync(deps(workspace, many));
    const second = await runSync(deps(workspace, many));
    const third = await runSync(deps(workspace, many));

    expect(first).toMatchObject({ isInitialImport: true, createdVisits: 160, createdTimelineEntries: 150, remainingTimelineEntries: 10 });
    expect(second).toMatchObject({ isInitialImport: true, createdVisits: 0, createdTimelineEntries: 10, remainingTimelineEntries: 0 });
    expect(third).toMatchObject({ isInitialImport: false });
    expect(workspace.state.timeline).toHaveLength(160);
  });

  it('does not create review tasks for old visits in the initial import', async () => {
    const workspace = createFakeWorkspace([]);
    const oldVisit = leadfeederVisit({
      id: 'old',
      companyId: 'lf-old',
      url: 'https://old.example',
      startedAt: '2026-09-01T10:00:00.000Z',
    });

    const result = await runSync(deps(workspace, [oldVisit]));

    expect(result).toMatchObject({ isInitialImport: true, createdReviewTasks: 0 });
  });

  it('writes nothing when Leadfeeder fails', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);

    await expect(
      runSync(deps(workspace, new LeadfeederApiError('boom', 500))),
    ).rejects.toThrow('boom');
    expect(workspace.state.visits).toEqual([]);
    expect(workspace.state.timeline).toEqual([]);
    expect(workspace.state.tasks).toEqual([]);
    expect(workspace.state.kv.size).toBe(0);
  });

  it('ignores visits of excluded Leadfeeder companies entirely', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);

    const result = await runSync({
      ...deps(workspace),
      excludedLeadfeederCompanyIds: ['lf-acme', 'lf-new'],
    });

    expect(result).toMatchObject({ ignoredVisits: 3, createdVisits: 0, createdReviewTasks: 0 });
    expect(workspace.state.visits).toEqual([]);
    expect(workspace.state.tasks).toEqual([]);
  });

  it('does not flag visits when all opportunities are closed', async () => {
    const workspace = createFakeWorkspace(
      [company('acme', 'acme.de')],
      [{ companyId: 'acme', stage: 'CLOSED_WON' }],
    );

    await runSync(deps(workspace));

    expect(workspace.state.visits.some((visit) => visit.hasOpenOpportunity)).toBe(false);
  });
});

describe('parseThreshold', () => {
  it.each([
    ['high', 'high'],
    [' Medium ', 'medium'],
    ['low', 'low'],
    [undefined, 'high'],
    ['bogus', 'high'],
  ])('%s → %s', (input, expected) => {
    expect(parseThreshold(input)).toBe(expected);
  });
});

describe('parseList', () => {
  it('splits and trims a comma-separated list', () => {
    expect(parseList(' CLOSED_WON, CLOSED_LOST ,,')).toEqual(['CLOSED_WON', 'CLOSED_LOST']);
    expect(parseList(undefined)).toEqual([]);
  });
});

describe('runSync — robustness', () => {
  it('skips while another run holds the lock and releases its own lock', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);
    workspace.state.kv.set('sync:lock', { lockedUntil: new Date(NOW.getTime() + 60_000).toISOString(), owner: 'other' });

    expect(await runSync(deps(workspace))).toMatchObject({ skipped: true });
    expect(workspace.state.visits).toEqual([]);

    workspace.state.kv.set('sync:lock', { lockedUntil: new Date(NOW.getTime() - 1).toISOString(), owner: 'other' });

    expect(await runSync(deps(workspace))).toMatchObject({ createdVisits: 2 });
    expect(workspace.state.kv.has('sync:lock')).toBe(false);
  });

  it('lets only one of two runs that start at the same time proceed', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);
    const results = await Promise.all([runSync(deps(workspace)), runSync(deps(workspace))]);

    expect(results.filter((result) => 'skipped' in result)).toHaveLength(1);
    expect(workspace.state.visits).toHaveLength(2);
    expect(workspace.state.timeline).toHaveLength(2);
    expect(workspace.state.tasks).toHaveLength(1);
  });

  it('writes nothing when the timeline lookup fails', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);
    workspace.twenty.findVisitIdsWithTimelineEntry = async () => {
      throw new Error('rate limited');
    };

    await expect(runSync(deps(workspace))).rejects.toThrow('rate limited');
    expect(workspace.state.visits).toEqual([]);
    expect(workspace.state.tasks).toEqual([]);
  });

  it('creates one task when two unknown Leadfeeder companies share a name', async () => {
    const workspace = createFakeWorkspace([]);
    const twins = ['lf-a', 'lf-b'].map((companyId, index) =>
      leadfeederVisit({ id: `t${index}`, companyId, name: 'Twin GmbH', url: `https://twin${index}.example` }),
    );

    await runSync(deps(workspace, twins));

    expect(workspace.state.tasks.map((task) => task.title)).toEqual(['Review website visitor: Twin GmbH']);
  });

  it('keeps the catch-up window until a run completes', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);
    workspace.state.kv.set('sync:initial-import-done', true);
    workspace.state.kv.set('sync:last-success', { finishedAt: '', windowStart: '2026-10-20', windowEnd: '2026-10-25' });
    const windows: string[] = [];
    const many = Array.from({ length: 160 }, (_, index) =>
      leadfeederVisit({ id: `c${index}`, companyId: 'lf-acme', url: 'https://acme.de', startedAt: new Date(NOW.getTime() - index * 3600 * 1000).toISOString() }),
    );
    const leadfeeder: LeadfeederClient = {
      listAccountIds: async () => [],
      searchWebVisits: async ({ startDate }) => {
        windows.push(startDate);
        return many;
      },
    };

    await runSync({ ...deps(workspace), leadfeeder });
    await runSync({ ...deps(workspace), leadfeeder });
    await runSync({ ...deps(workspace), leadfeeder });

    expect(windows).toEqual(['2026-10-24', '2026-10-24', '2026-11-04']);
  });

  it('releases the lock when a run fails', async () => {
    const workspace = createFakeWorkspace([company('acme', 'acme.de')]);

    await expect(runSync(deps(workspace, new LeadfeederApiError('boom', 500)))).rejects.toThrow();
    expect(workspace.state.kv.has('sync:lock')).toBe(false);
  });

  it('does not create a review task while one with the same title is open', async () => {
    const workspace = createFakeWorkspace([]);
    workspace.state.tasks.push({
      leadfeederCompanyId: 'lf-new',
      title: 'Review website visitor: New Co',
      markdown: '',
      status: 'IN_PROGRESS',
    });

    await runSync(deps(workspace));

    expect(
      workspace.state.tasks.filter((task) => task.title === 'Review website visitor: New Co'),
    ).toHaveLength(1);
    expect(workspace.state.kv.has('review-task:lf-new')).toBe(false);
  });

  it('creates many review tasks in batches of at most 60', async () => {
    const workspace = createFakeWorkspace([]);
    const many = Array.from({ length: 130 }, (_, index) =>
      leadfeederVisit({ id: `u${index}`, companyId: `lf-${index}`, name: `Co ${index}`, url: `https://co${index}.example` }),
    );

    const result = await runSync(deps(workspace, many));

    expect(result).toMatchObject({ createdReviewTasks: 130 });
    expect(workspace.state.taskBatchSizes).toEqual([60, 60, 10]);
    expect(workspace.state.kv.get('review-task:lf-129')).toBe(NOW.toISOString());
  });
});

describe('syncWindowStart', () => {
  const lastSync = (windowEnd: string): LastSuccessfulSync => ({
    finishedAt: `${windowEnd}T10:00:00.000Z`,
    windowStart: '2026-10-01',
    windowEnd,
  });

  it('imports 12 weeks on the first run', () => {
    expect(syncWindowStart({ isInitialImport: true, lastSuccessfulSync: null, now: NOW })).toBe('2026-08-14');
  });

  it('reads 48 hours when the last run is recent', () => {
    expect(syncWindowStart({ isInitialImport: false, lastSuccessfulSync: lastSync('2026-11-06'), now: NOW })).toBe('2026-11-04');
  });

  it('catches up from the day before the last successful window after an outage', () => {
    expect(syncWindowStart({ isInitialImport: false, lastSuccessfulSync: lastSync('2026-10-30'), now: NOW })).toBe('2026-10-29');
  });

  it('never goes back more than 12 weeks', () => {
    expect(syncWindowStart({ isInitialImport: false, lastSuccessfulSync: lastSync('2026-01-01'), now: NOW })).toBe('2026-08-14');
  });
});
