import type {
  LeadfeederEngagement,
  LeadfeederWebVisit,
} from 'src/sync/leadfeeder-client';

export const leadfeederVisit = ({
  id,
  companyId = 'lf-1',
  name = 'Acme GmbH',
  url = 'https://www.acme.de/impressum',
  alternativeUrls = [],
  score = 7,
  tier = 'high',
  startedAt = '2026-11-06T10:00:00.000Z',
  landingPagePath = '/case-studies/acme',
  formSubmitted = false,
}: {
  id: string;
  companyId?: string;
  name?: string;
  url?: string | null;
  alternativeUrls?: string[];
  score?: number | null;
  tier?: string | null;
  startedAt?: string;
  landingPagePath?: string;
  formSubmitted?: boolean;
}): LeadfeederWebVisit => {
  const engagements: LeadfeederEngagement[] = [
    {
      event_type: 'page-view',
      page: { path: landingPagePath, title: 'Case study' },
    },
    {
      event_type: 'page-view',
      page: { path: '/contact', title: 'Contact' },
    },
  ];

  if (formSubmitted) {
    engagements.push({
      event_type: 'form-submit',
      page: { path: '/contact', title: 'Contact' },
    });
  }

  return {
    id,
    attributes: {
      started_at: startedAt,
      landing_page_path: landingPagePath,
      page_depth: 2,
      visit_length: 80,
      source: 'google',
      medium: 'organic',
      campaign: null,
      referring_url: 'https://www.google.com/',
      engagements,
    },
    relationships: {
      company: {
        id: companyId,
        attributes: {
          name,
          url,
          alternative_urls: alternativeUrls,
          app_url: `https://app.leadfeeder.com/h/company/${companyId}`,
          intent: { score, score_tier: tier },
        },
      },
      location: { attributes: { city: 'Hamburg', country_code: 'DE' } },
    },
  };
};
