import { CoreApiClient } from 'twenty-client-sdk/core';
import { createTimelineActivity } from 'twenty-sdk/logic-function';

import {
  COMPANY_OBJECT_UNIVERSAL_IDENTIFIER,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
  WEBSITE_VISITED_TIMELINE_ACTIVITY_TYPE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { domainSearchTerms, normalizeDomain } from 'src/sync/domain';
import type {
  CompanyUpdate,
  ReviewTask,
  TimelineEntry,
  TwentyCompany,
  WebsiteVisitInput,
} from 'src/sync/plan-sync';

const PAGE_SIZE = 100;
const MAX_PAGES = 500;
const FILTER_CHUNK_SIZE = 100;
const DOMAIN_CHUNK_SIZE = 20;
export const WRITE_CHUNK_SIZE = 60;

export const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

type Page<T> = {
  edges: { node: T }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type CompanyNode = {
  id: string;
  name: string | null;
  createdAt: string;
  domainName: { primaryLinkUrl: string | null } | null;
  leadfeederCompanyId: string | null;
  leadfeederIntentScore: number | null;
  leadfeederIntentTier: string | null;
  lastWebsiteVisit: string | null;
};

export const createTwentyRepository = (
  client = new CoreApiClient({ runAs: 'application' }),
) => {
  // Reads every page of a filtered query and fails loudly rather than
  // returning a partial result.
  const findAll = async <T>(
    objectName: string,
    filter: object,
    node: Record<string, unknown>,
  ): Promise<T[]> => {
    const nodes: T[] = [];
    const seenCursors = new Set<string>();
    let after: string | null = null;

    do {
      if (seenCursors.size >= MAX_PAGES) {
        throw new Error(`${objectName}: more than ${MAX_PAGES} pages`);
      }

      const result = (await client.query({
        [objectName]: {
          __args: { filter, first: PAGE_SIZE, ...(after ? { after } : {}) },
          edges: { node },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      })) as unknown as Record<string, Page<T>>;
      const page = result[objectName];

      nodes.push(...page.edges.map((edge) => edge.node));

      if (!page.pageInfo.hasNextPage) {
        break;
      }

      after = page.pageInfo.endCursor;

      if (!after || seenCursors.has(after)) {
        throw new Error(`${objectName}: pagination returned no new cursor`);
      }

      seenCursors.add(after);
    } while (after);

    return nodes;
  };

  return {
    // The domain field holds whatever was typed or imported (case, scheme,
    // www., path, Unicode), so candidates are found with a loose ilike and
    // kept only when they normalise to exactly a requested domain. When
    // several companies share a domain, the oldest one wins.
    findCompaniesByDomains: async (
      domains: string[],
    ): Promise<Map<string, TwentyCompany>> => {
      const requested = new Set(domains);
      const nodes: CompanyNode[] = [];

      for (const domainChunk of chunk(domains, DOMAIN_CHUNK_SIZE)) {
        nodes.push(
          ...(await findAll<CompanyNode>(
            'companies',
            {
              or: domainChunk.flatMap(domainSearchTerms).map((term) => ({
                domainName: { primaryLinkUrl: { ilike: `%${term}%` } },
              })),
            },
            {
              id: true,
              name: true,
              createdAt: true,
              domainName: { primaryLinkUrl: true },
              leadfeederCompanyId: true,
              leadfeederIntentScore: true,
              leadfeederIntentTier: true,
              lastWebsiteVisit: true,
            },
          )),
        );
      }

      const byDomain = new Map<string, TwentyCompany>();

      nodes
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .forEach((node) => {
          const domain = normalizeDomain(node.domainName?.primaryLinkUrl);

          if (domain && requested.has(domain) && !byDomain.has(domain)) {
            byDomain.set(domain, {
              id: node.id,
              name: node.name ?? domain,
              domain,
              leadfeederCompanyId: node.leadfeederCompanyId ?? null,
              leadfeederIntentScore: node.leadfeederIntentScore ?? null,
              leadfeederIntentTier: node.leadfeederIntentTier ?? null,
              lastWebsiteVisit: node.lastWebsiteVisit ?? null,
            });
          }
        });

      return byDomain;
    },

    findExistingVisits: async (
      leadfeederVisitIds: string[],
    ): Promise<Map<string, string>> => {
      const existing = new Map<string, string>();

      for (const ids of chunk(leadfeederVisitIds, FILTER_CHUNK_SIZE)) {
        const visits = await findAll<{ id: string; leadfeederVisitId: string }>(
          'websiteVisits',
          { leadfeederVisitId: { in: ids } },
          { id: true, leadfeederVisitId: true },
        );

        visits.forEach((visit) => existing.set(visit.leadfeederVisitId, visit.id));
      }

      return existing;
    },

    findCompanyIdsWithOpenOpportunity: async (
      companyIds: string[],
      closedStages: string[],
    ): Promise<Set<string>> => {
      const withOpenOpportunity = new Set<string>();

      for (const ids of chunk(companyIds, FILTER_CHUNK_SIZE)) {
        const opportunities = await findAll<{
          companyId: string;
          stage: string | null;
        }>(
          'opportunities',
          { companyId: { in: ids } },
          { companyId: true, stage: true },
        );

        opportunities
          .filter((opportunity) => !closedStages.includes(opportunity.stage ?? ''))
          .forEach((opportunity) => withOpenOpportunity.add(opportunity.companyId));
      }

      return withOpenOpportunity;
    },

    findVisitIdsWithTimelineEntry: async (
      visitRecordIds: string[],
    ): Promise<Set<string>> => {
      const linked = new Set<string>();

      for (const ids of chunk(visitRecordIds, FILTER_CHUNK_SIZE)) {
        const entries = await findAll<{ linkedRecordId: string }>(
          'timelineActivities',
          { linkedRecordId: { in: ids }, targetCompanyId: { is: 'NOT_NULL' } },
          { linkedRecordId: true },
        );

        entries.forEach((entry) => linked.add(entry.linkedRecordId));
      }

      return linked;
    },

    findOpenTaskTitles: async (titles: string[]): Promise<Set<string>> => {
      const open = new Set<string>();

      for (const titleChunk of chunk(titles, FILTER_CHUNK_SIZE)) {
        const tasks = await findAll<{ title: string; status: string | null }>(
          'tasks',
          { title: { in: titleChunk } },
          { title: true, status: true },
        );

        tasks
          .filter((task) => task.status !== 'DONE')
          .forEach((task) => open.add(task.title));
      }

      return open;
    },

    createWebsiteVisits: async (
      visits: WebsiteVisitInput[],
    ): Promise<Map<string, string>> => {
      const created = new Map<string, string>();

      for (const data of chunk(visits, WRITE_CHUNK_SIZE)) {
        const { createWebsiteVisits } = (await client.mutation({
          createWebsiteVisits: {
            __args: { data },
            id: true,
            leadfeederVisitId: true,
          },
        })) as {
          createWebsiteVisits: { id: string; leadfeederVisitId: string }[];
        };

        createWebsiteVisits.forEach((visit) =>
          created.set(visit.leadfeederVisitId, visit.id),
        );
      }

      return created;
    },

    createTimelineEntries: async (
      entries: (TimelineEntry & { visitRecordId: string })[],
    ) => {
      for (const entry of entries) {
        await createTimelineActivity({
          timelineActivityTypeUniversalIdentifier:
            WEBSITE_VISITED_TIMELINE_ACTIVITY_TYPE_UNIVERSAL_IDENTIFIER,
          targetObjectUniversalIdentifier: COMPANY_OBJECT_UNIVERSAL_IDENTIFIER,
          targetRecordId: entry.companyId,
          happensAt: entry.happensAt,
          properties: entry.properties,
          linkedObjectMetadataUniversalIdentifier:
            WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
          linkedRecordId: entry.visitRecordId,
        });
      }
    },

    // One update per company: an update can never create a record, unlike an
    // upsert racing with a company deleted mid-run.
    updateCompanies: async (updates: CompanyUpdate[]) => {
      for (const { id, ...data } of updates) {
        await client.mutation({
          updateCompany: { __args: { id, data }, id: true },
        });
      }
    },

    createReviewTasks: async (tasks: ReviewTask[]) => {
      for (const taskChunk of chunk(tasks, WRITE_CHUNK_SIZE)) {
        await client.mutation({
          createTasks: {
            __args: {
              data: taskChunk.map((task) => ({
                title: task.title,
                status: 'TODO',
                bodyV2: { markdown: task.markdown },
              })),
            },
            id: true,
          },
        });
      }
    },
  };
};

export type TwentyRepository = ReturnType<typeof createTwentyRepository>;
