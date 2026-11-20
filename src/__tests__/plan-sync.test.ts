import { describe, expect, it } from 'vitest';

import { leadfeederVisit } from 'src/__tests__/fixtures';
import { mapVisits } from 'src/sync/map-visit';
import { planSync, type TwentyCompany } from 'src/sync/plan-sync';

const NOW = new Date('2026-11-06T12:00:00.000Z');

const acme: TwentyCompany = {
  id: 'company-acme',
  name: 'Acme',
  domain: 'acme.de',
  leadfeederCompanyId: null,
  leadfeederIntentScore: null,
  leadfeederIntentTier: null,
  lastWebsiteVisit: null,
};

const plan = (
  overrides: Partial<Parameters<typeof planSync>[0]> & {
    rawVisits: ReturnType<typeof leadfeederVisit>[];
  },
) =>
  planSync({
    visits: mapVisits(overrides.rawVisits).visits,
    companiesByDomain: new Map([['acme.de', acme]]),
    existingVisitIds: new Set(),
    companyIdsWithOpenOpportunity: new Set(),
    lastReviewTaskAt: new Map(),
    reviewTaskSince: new Date(NOW.getTime() - 2 * 24 * 3600 * 1000),
    threshold: 'high',
    now: NOW,
    ...overrides,
  });

describe('planSync — matched companies', () => {
  it('creates new visits and updates the company with the latest values', () => {
    const result = plan({
      rawVisits: [
        leadfeederVisit({ id: 'v1', startedAt: '2026-11-05T08:00:00.000Z', score: 5, tier: 'medium' }),
        leadfeederVisit({ id: 'v2', startedAt: '2026-11-06T09:00:00.000Z', score: 8, tier: 'high' }),
      ],
    });

    expect(result.visitsToCreate.map((visit) => visit.leadfeederVisitId)).toEqual(['v1', 'v2']);
    expect(result.visitsToCreate[0]).toMatchObject({
      companyId: 'company-acme',
      position: Date.parse('2026-11-05T08:00:00.000Z') / 1000,
      intentTier: 'MEDIUM',
      leadfeederLink: {
        primaryLinkUrl: 'https://app.leadfeeder.com/h/company/lf-1',
        primaryLinkLabel: 'Leadfeeder',
      },
    });
    expect(result.companyUpdates).toEqual([
      {
        id: 'company-acme',
        leadfeederCompanyId: 'lf-1',
        leadfeederIntentScore: 8,
        leadfeederIntentTier: 'HIGH',
        lastWebsiteVisit: '2026-11-06T09:00:00.000Z',
      },
    ]);
    expect(result.reviewTasks).toEqual([]);
  });

  it('flags visits of companies with an open opportunity', () => {
    const result = plan({
      rawVisits: [leadfeederVisit({ id: 'v1' })],
      companyIdsWithOpenOpportunity: new Set(['company-acme']),
    });

    expect(result.visitsToCreate[0].hasOpenOpportunity).toBe(true);
    expect(
      plan({ rawVisits: [leadfeederVisit({ id: 'v1' })] }).visitsToCreate[0]
        .hasOpenOpportunity,
    ).toBe(false);
  });

  it('plans a timeline entry with the page list for every matched visit', () => {
    const result = plan({
      rawVisits: [leadfeederVisit({ id: 'v1' }), leadfeederVisit({ id: 'v2' })],
      existingVisitIds: new Set(['v1']),
    });

    expect(result.timelineEntries).toHaveLength(2);
    expect(result.timelineEntries[0]).toEqual({
      leadfeederVisitId: 'v1',
      companyId: 'company-acme',
      happensAt: '2026-11-06T10:00:00.000Z',
      properties: {
        landingPage: '/case-studies/acme',
        pages: ['/case-studies/acme — Case study', '/contact — Contact'],
        pageDepth: 2,
        durationSeconds: 80,
        formSubmitted: false,
        visitLocation: 'Hamburg, DE',
        source: 'google',
        medium: 'organic',
        campaign: null,
        intentScore: 7,
        intentTier: 'high',
      },
    });
  });

  it('matches through alternative urls', () => {
    const result = plan({
      rawVisits: [
        leadfeederVisit({
          id: 'v1',
          url: 'https://acme-group.com',
          alternativeUrls: ['http://www.acme.de/'],
        }),
      ],
    });

    expect(result.visitsToCreate).toHaveLength(1);
  });

  it('skips visits that already exist (idempotent rerun)', () => {
    const result = plan({
      rawVisits: [leadfeederVisit({ id: 'v1' })],
      existingVisitIds: new Set(['v1']),
      companiesByDomain: new Map([
        [
          'acme.de',
          {
            ...acme,
            leadfeederCompanyId: 'lf-1',
            leadfeederIntentScore: 7,
            leadfeederIntentTier: 'HIGH',
            lastWebsiteVisit: '2026-11-06T10:00:00Z',
          },
        ],
      ]),
    });

    expect(result).toMatchObject({
      visitsToCreate: [],
      companyUpdates: [],
      reviewTasks: [],
      unmatchedBelowThreshold: 0,
    });
  });

  it('never moves lastWebsiteVisit backwards', () => {
    const result = plan({
      rawVisits: [leadfeederVisit({ id: 'v1', startedAt: '2026-11-05T10:00:00.000Z' })],
      companiesByDomain: new Map([
        ['acme.de', { ...acme, lastWebsiteVisit: '2026-11-06T11:00:00.000Z' }],
      ]),
    });

    expect(result.companyUpdates[0].lastWebsiteVisit).toBe('2026-11-06T11:00:00.000Z');
  });
});

describe('planSync — unknown companies', () => {
  const unknown = (id: string, tier: string, companyId = 'lf-9', formSubmitted = false) =>
    leadfeederVisit({
      id,
      companyId,
      name: 'Unknown AG',
      url: 'https://unknown.example',
      tier,
      formSubmitted,
    });

  it('creates a task for a form submission whatever the intent tier', () => {
    const result = plan({ rawVisits: [unknown('v1', 'low', 'lf-9', true)] });

    expect(result.reviewTasks).toHaveLength(1);
    expect(result.reviewTasks[0].markdown).toContain(
      '**✉ Form submitted on /contact** (6 Nov 2026, 11:00).',
    );
    expect(result.reviewTasks[0].markdown).toContain('- Visit location: Hamburg, DE');
    expect(result.unmatchedBelowThreshold).toBe(0);
  });

  it('creates one review task per company at or above the threshold', () => {
    const result = plan({
      rawVisits: [unknown('v1', 'high'), unknown('v2', 'high')],
    });

    expect(result.visitsToCreate).toEqual([]);
    expect(result.reviewTasks).toHaveLength(1);
    expect(result.reviewTasks[0]).toMatchObject({
      leadfeederCompanyId: 'lf-9',
      title: 'Review website visitor: Unknown AG',
    });
    expect(result.reviewTasks[0].markdown).toContain('- Last visit: 6 Nov 2026, 11:00');
    expect(result.reviewTasks[0].markdown).toContain('create it in Twenty with the domain unknown.example');
    expect(result.reviewTasks[0].markdown).toContain(
      '[Open in Leadfeeder](https://app.leadfeeder.com/h/company/lf-9)',
    );
  });

  it('skips companies below the threshold', () => {
    const result = plan({ rawVisits: [unknown('v1', 'medium'), unknown('v2', 'low', 'lf-8')] });

    expect(result.reviewTasks).toEqual([]);
    expect(result.unmatchedBelowThreshold).toBe(2);
  });

  it('only considers visits since reviewTaskSince for tasks', () => {
    const old = leadfeederVisit({
      id: 'v1',
      companyId: 'lf-9',
      url: 'https://unknown.example',
      startedAt: '2026-10-01T10:00:00.000Z',
    });

    expect(plan({ rawVisits: [old] }).reviewTasks).toEqual([]);
  });

  it('respects a lower threshold', () => {
    expect(plan({ rawVisits: [unknown('v1', 'medium')], threshold: 'medium' }).reviewTasks).toHaveLength(1);
  });

  it('creates at most one task per company per 7 days', () => {
    const sixDaysAgo = new Date(NOW.getTime() - 6 * 24 * 3600 * 1000).toISOString();
    const eightDaysAgo = new Date(NOW.getTime() - 8 * 24 * 3600 * 1000).toISOString();

    expect(
      plan({ rawVisits: [unknown('v1', 'high')], lastReviewTaskAt: new Map([['lf-9', sixDaysAgo]]) })
        .reviewTasks,
    ).toHaveLength(0);
    expect(
      plan({ rawVisits: [unknown('v1', 'high')], lastReviewTaskAt: new Map([['lf-9', eightDaysAgo]]) })
        .reviewTasks,
    ).toHaveLength(1);
  });
});
