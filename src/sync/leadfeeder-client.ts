const LEADFEEDER_API_BASE_URL = 'https://api.leadfeeder.com';
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;

type LeadfeederCompany = {
  id: string;
  attributes?: {
    name?: string | null;
    url?: string | null;
    alternative_urls?: string[] | null;
    app_url?: string | null;
    intent?: {
      score?: number | null;
      score_tier?: string | null;
    } | null;
  };
};

export type LeadfeederEngagement = {
  event_type?: string;
  time?: string;
  page?: { path?: string; title?: string; url?: string };
};

export type LeadfeederVisitLocation = {
  attributes?: {
    city?: string | null;
    country?: string | null;
    country_code?: string | null;
  };
};

export type LeadfeederWebVisit = {
  id: string;
  attributes: {
    started_at: string;
    landing_page_path?: string | null;
    engagements?: LeadfeederEngagement[] | null;
    page_depth?: number | null;
    visit_length?: number | null;
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    referring_url?: string | null;
  };
  relationships?: {
    company?: LeadfeederCompany | null;
    location?: LeadfeederVisitLocation | null;
  };
};

type SearchWebVisitsResponse = {
  data: LeadfeederWebVisit[];
  meta?: { pagination?: { page_count?: number; page_num?: number } };
};

export class LeadfeederApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'LeadfeederApiError';
  }
}

type LeadfeederClientOptions = {
  apiKey: string;
  accountId: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Retry-After first, exponential backoff otherwise. Null when the server asks
// to wait longer than a run should: retrying earlier would only burn quota.
const retryDelayMs = (response: Response | null, attempt: number) => {
  const retryAfterSeconds = Number(response?.headers.get('retry-after'));
  const delay =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : 1000 * 2 ** attempt;

  return delay > MAX_RETRY_DELAY_MS ? null : delay;
};

export const createLeadfeederClient = ({
  apiKey,
  accountId,
  fetchImpl = fetch,
  sleep = defaultSleep,
}: LeadfeederClientOptions) => {
  const request = async <T>(
    method: 'GET' | 'POST',
    path: string,
    query: Record<string, string>,
    body?: unknown,
  ): Promise<T> => {
    const url = `${LEADFEEDER_API_BASE_URL}${path}?${new URLSearchParams(query)}`;

    for (let attempt = 0; ; attempt++) {
      let response: Response;

      try {
        response = await fetchImpl(url, {
          method,
          headers: {
            'X-Api-Key': apiKey,
            Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          await sleep(retryDelayMs(null, attempt) ?? MAX_RETRY_DELAY_MS);
          continue;
        }

        throw new LeadfeederApiError(
          `Leadfeeder ${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
          0,
        );
      }

      if (response.ok) {
        return (await response.json()) as T;
      }

      const detail = (await response.text().catch(() => '')).slice(0, 300);
      // A used-up monthly quota does not recover within this run.
      const isQuotaExceeded = detail.includes('quota_exceeded');

      const delay = retryDelayMs(response, attempt);

      if (
        RETRYABLE_STATUSES.has(response.status) &&
        !isQuotaExceeded &&
        delay !== null &&
        attempt < MAX_RETRIES
      ) {
        await sleep(delay);
        continue;
      }

      throw new LeadfeederApiError(
        `Leadfeeder ${method} ${path} failed with ${response.status}: ${detail}`,
        response.status,
      );
    }
  };

  return {
    listAccountIds: async (): Promise<string[]> => {
      const result = await request<{ data: { id: string }[] }>(
        'GET',
        '/v1/accounts',
        {},
      );

      return result.data.map((account) => String(account.id));
    },

    searchWebVisits: async ({
      startDate,
      endDate,
    }: {
      startDate: string;
      endDate: string;
    }): Promise<LeadfeederWebVisit[]> => {
      const visits: LeadfeederWebVisit[] = [];

      for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
        const page = await request<SearchWebVisitsResponse>(
          'POST',
          '/v1/web-visits',
          {
            account_id: accountId,
            include: 'company',
            'page[num]': String(pageNum),
            'page[size]': String(PAGE_SIZE),
          },
          { start_date: startDate, end_date: endDate },
        );

        const pageCount = page.meta?.pagination?.page_count;

        if (pageCount !== undefined && pageCount > MAX_PAGES) {
          throw new LeadfeederApiError(
            `${pageCount} pages of web visits between ${startDate} and ${endDate} exceed the limit of ${MAX_PAGES}`,
            0,
          );
        }

        visits.push(...page.data);

        const isLastPage =
          pageCount === undefined
            ? page.data.length < PAGE_SIZE
            : pageNum >= pageCount;

        if (isLastPage) {
          return visits;
        }
      }

      throw new LeadfeederApiError(
        `More than ${MAX_PAGES} pages of web visits between ${startDate} and ${endDate}`,
        0,
      );
    },
  };
};

export type LeadfeederClient = ReturnType<typeof createLeadfeederClient>;
