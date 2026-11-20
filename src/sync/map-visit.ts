import { isIntentTier, type IntentTier } from 'src/constants/intent-tier';
import { uniqueDomains } from 'src/sync/domain';
import type {
  LeadfeederEngagement,
  LeadfeederWebVisit,
} from 'src/sync/leadfeeder-client';

export type Visit = {
  leadfeederVisitId: string;
  leadfeederCompanyId: string;
  companyName: string;
  domains: string[];
  visitedAt: string;
  landingPage: string | null;
  pageList: string[];
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
  intentTier: IntentTier | null;
  leadfeederUrl: string | null;
};

const MAX_PAGES_TEXT_LENGTH = 5000;

export const FORM_SUBMITTED_PREFIX = '✉ Form submitted on ';

const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();

// Query strings and fragments can carry personal data (for example a form
// that redirects with ?email=…), so only the path is kept.
const withoutQuery = (value: string) => value.split(/[?#]/)[0];

const cleanPath = (value: string | null | undefined) => {
  const path = typeof value === 'string' ? singleLine(withoutQuery(value)) : '';

  return path === '' ? null : path;
};

const isFormSubmit = (engagement: LeadfeederEngagement) =>
  engagement.event_type === 'form-submit';

// Only the page and the fact that a form was sent are kept, never the
// submitted values: the integration is company-level only.
const describeEngagement = (engagement: LeadfeederEngagement, path: string) => {
  const title = engagement.page?.title ? singleLine(engagement.page.title) : '';

  if (isFormSubmit(engagement)) {
    return `${FORM_SUBMITTED_PREFIX}${path}`;
  }

  const prefix = engagement.event_type === 'video-view' ? '▶ ' : '';

  return title ? `${prefix}${path} — ${title}` : `${prefix}${path}`;
};

const listPages = (visit: LeadfeederWebVisit) => {
  const lines: string[] = [];
  let length = 0;

  for (const engagement of visit.attributes.engagements ?? []) {
    const path = cleanPath(engagement.page?.path);

    if (!path) {
      continue;
    }

    const line = describeEngagement(engagement, path);

    if (line === lines[lines.length - 1]) {
      continue;
    }

    length += line.length + 1;

    if (length > MAX_PAGES_TEXT_LENGTH) {
      break;
    }

    lines.push(line);
  }

  return lines;
};

const formatLocation = (visit: LeadfeederWebVisit) => {
  const location = visit.relationships?.location?.attributes;
  const parts = [location?.city, location?.country_code || location?.country]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part !== '');

  return parts.length > 0 ? parts.join(', ') : null;
};

const emptyToNull = (value: string | null | undefined) =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const toIsoTimestamp = (value: string | undefined) => {
  const time = value ? Date.parse(value) : Number.NaN;

  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

export const mapVisit = (visit: LeadfeederWebVisit): Visit | null => {
  const company = visit.relationships?.company;
  const visitedAt = toIsoTimestamp(visit.attributes?.started_at);

  if (!company?.id || !visitedAt) {
    return null;
  }

  const attributes = company.attributes ?? {};
  const score = attributes.intent?.score;
  const tier = attributes.intent?.score_tier;
  const pageList = listPages(visit);

  return {
    leadfeederVisitId: String(visit.id),
    leadfeederCompanyId: String(company.id),
    companyName:
      emptyToNull(attributes.name)?.trim() ?? `Leadfeeder company ${company.id}`,
    domains: uniqueDomains([attributes.url, ...(attributes.alternative_urls ?? [])]),
    visitedAt,
    landingPage: cleanPath(visit.attributes.landing_page_path),
    pageList,
    pages: pageList.join('\n'),
    pageDepth: visit.attributes.page_depth ?? null,
    durationSeconds: visit.attributes.visit_length ?? null,
    formSubmitted: (visit.attributes.engagements ?? []).some(isFormSubmit),
    visitLocation: formatLocation(visit),
    source: emptyToNull(visit.attributes.source),
    medium: emptyToNull(visit.attributes.medium),
    campaign: emptyToNull(visit.attributes.campaign),
    referringUrl: emptyToNull(
      visit.attributes.referring_url && withoutQuery(visit.attributes.referring_url),
    ),
    intentScore: typeof score === 'number' ? score : null,
    intentTier: isIntentTier(tier) ? tier : null,
    leadfeederUrl: emptyToNull(attributes.app_url),
  };
};

export const mapVisits = (visits: LeadfeederWebVisit[]) => {
  const byId = new Map<string, Visit>();
  let skipped = 0;

  for (const visit of visits) {
    const mapped = mapVisit(visit);

    if (mapped) {
      byId.set(mapped.leadfeederVisitId, mapped);
    } else {
      skipped++;
    }
  }

  return { visits: [...byId.values()], skipped };
};
