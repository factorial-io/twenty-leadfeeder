import { describe, expect, it } from 'vitest';

import { leadfeederVisit } from 'src/__tests__/fixtures';
import { mapVisit, mapVisits } from 'src/sync/map-visit';

describe('mapVisit', () => {
  it('maps a Leadfeeder web visit with its company', () => {
    expect(
      mapVisit(
        leadfeederVisit({
          id: 'v1',
          alternativeUrls: ['https://acme.com'],
        }),
      ),
    ).toEqual({
      leadfeederVisitId: 'v1',
      leadfeederCompanyId: 'lf-1',
      companyName: 'Acme GmbH',
      domains: ['acme.de', 'acme.com'],
      visitedAt: '2026-11-06T10:00:00.000Z',
      landingPage: '/case-studies/acme',
      pageList: ['/case-studies/acme — Case study', '/contact — Contact'],
      pages: '/case-studies/acme — Case study\n/contact — Contact',
      pageDepth: 2,
      durationSeconds: 80,
      formSubmitted: false,
      visitLocation: 'Hamburg, DE',
      source: 'google',
      medium: 'organic',
      campaign: null,
      referringUrl: 'https://www.google.com/',
      intentScore: 7,
      intentTier: 'high',
      leadfeederUrl: 'https://app.leadfeeder.com/h/company/lf-1',
    });
  });

  it('marks form submissions without keeping the submitted values', () => {
    const visit = leadfeederVisit({ id: 'v1', formSubmitted: true });
    visit.attributes.engagements![2] = {
      event_type: 'form-submit',
      page: { path: '/contact', title: 'Contact' },
      form: { inputs: [{ name: 'email', value: 'jane@acme.de' }] },
    } as never;

    const mapped = mapVisit(visit)!;

    expect(mapped.formSubmitted).toBe(true);
    expect(mapped.pageList).toEqual([
      '/case-studies/acme — Case study',
      '/contact — Contact',
      '✉ Form submitted on /contact',
    ]);
    expect(JSON.stringify(mapped)).not.toContain('jane@acme.de');
  });

  it('drops query strings and fragments that could carry personal data', () => {
    const visit = leadfeederVisit({ id: 'v1', landingPagePath: '/thanks?email=jane@acme.de#top' });
    visit.attributes.referring_url = 'https://mail.example/read?to=jane@acme.de';

    const mapped = mapVisit(visit)!;

    expect(mapped.landingPage).toBe('/thanks');
    expect(mapped.pageList[0]).toBe('/thanks — Case study');
    expect(mapped.referringUrl).toBe('https://mail.example/read');
    expect(JSON.stringify(mapped)).not.toContain('jane@acme.de');
  });

  it('collapses consecutive duplicates and keeps titles on one line', () => {
    const visit = leadfeederVisit({ id: 'v1' });
    visit.attributes.engagements = [
      { event_type: 'page-view', page: { path: '/', title: 'Home\n  page' } },
      { event_type: 'page-view', page: { path: '/', title: 'Home page' } },
      { event_type: 'video-view', page: { path: '/', title: 'Home page' } },
    ];

    expect(mapVisit(visit)?.pageList).toEqual(['/ — Home page', '▶ / — Home page']);
  });

  it('skips visits without a company or with an invalid date', () => {
    const withoutCompany = leadfeederVisit({ id: 'v1' });
    withoutCompany.relationships = { company: null };

    expect(mapVisit(withoutCompany)).toBeNull();
    expect(mapVisit(leadfeederVisit({ id: 'v2', startedAt: 'not a date' }))).toBeNull();
  });

  it('ignores unknown tiers and falls back to a name for blank company names', () => {
    expect(mapVisit(leadfeederVisit({ id: 'v1', tier: 'extreme' }))?.intentTier).toBeNull();
    expect(mapVisit(leadfeederVisit({ id: 'v2', name: '  ' }))?.companyName).toBe(
      'Leadfeeder company lf-1',
    );
  });
});

describe('mapVisits', () => {
  it('deduplicates visits by id and counts skipped ones', () => {
    expect(
      mapVisits([
        leadfeederVisit({ id: 'v1' }),
        leadfeederVisit({ id: 'v1' }),
        leadfeederVisit({ id: 'v2', startedAt: '' }),
      ]),
    ).toMatchObject({ visits: [{ leadfeederVisitId: 'v1' }], skipped: 1 });
  });
});
