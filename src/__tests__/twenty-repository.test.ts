import { describe, expect, it, vi } from 'vitest';

import { createTwentyRepository } from 'src/sync/twenty-repository';

type Query = Record<
  string,
  { __args: { filter: unknown; first: number; after?: string } }
>;

const company = (id: string, primaryLinkUrl: string, createdAt: string) => ({
  id,
  name: id,
  createdAt,
  domainName: { primaryLinkUrl },
  leadfeederCompanyId: null,
  leadfeederIntentScore: null,
  leadfeederIntentTier: null,
  lastWebsiteVisit: null,
});

// Returns the given pages one after another, like Twenty's cursor pagination.
const fakeClient = (objectName: string, pages: object[][], cursors?: (string | null)[]) => {
  const queries: Query[] = [];
  const query = vi.fn(async (selection: Query) => {
    queries.push(selection);
    const index = queries.length - 1;
    const hasNextPage = index < pages.length - 1;

    return {
      [objectName]: {
        edges: (pages[index] ?? []).map((node) => ({ node })),
        pageInfo: {
          hasNextPage,
          endCursor: cursors ? cursors[index] : hasNextPage ? `cursor-${index}` : null,
        },
      },
    };
  });

  return { client: { query, mutation: vi.fn() } as never, queries };
};

describe('findCompaniesByDomains', () => {
  it('searches loosely and keeps only companies whose stored domain normalises to a requested one', async () => {
    const { client, queries } = fakeClient('companies', [
      [
        company('messy', 'HTTPS://WWW.Acme.DE/en/start', '2024-01-01'),
        company('lookalike', 'https://notacme.de', '2020-01-01'),
        company('suffix', 'acme.de.example.com', '2020-01-01'),
        company('umlaut', 'müller-bau.de', '2024-01-01'),
      ],
    ]);

    const found = await createTwentyRepository(client).findCompaniesByDomains([
      'acme.de',
      'xn--mller-bau-q9a.de',
    ]);

    expect([...found.entries()].map(([domain, match]) => [domain, match.id])).toEqual([
      ['acme.de', 'messy'],
      ['xn--mller-bau-q9a.de', 'umlaut'],
    ]);
    expect(queries[0].companies.__args.filter).toEqual({
      or: [
        { domainName: { primaryLinkUrl: { ilike: '%acme.de%' } } },
        { domainName: { primaryLinkUrl: { ilike: '%xn--mller-bau-q9a.de%' } } },
        { domainName: { primaryLinkUrl: { ilike: '%müller-bau.de%' } } },
      ],
    });
  });

  it('reads every page and lets the oldest company win a shared domain', async () => {
    const { client, queries } = fakeClient('companies', [
      [company('newer', 'acme.de', '2025-01-01')],
      [company('older', 'https://acme.de', '2021-01-01')],
    ]);

    const found = await createTwentyRepository(client).findCompaniesByDomains(['acme.de']);

    expect(found.get('acme.de')?.id).toBe('older');
    expect(queries).toHaveLength(2);
    expect(queries[1].companies.__args.after).toBe('cursor-0');
  });
});

describe('pagination guard', () => {
  it('fails instead of looping when the cursor does not advance', async () => {
    const { client } = fakeClient(
      'websiteVisits',
      [[{ id: 'a', leadfeederVisitId: 'v1' }], [{ id: 'b', leadfeederVisitId: 'v2' }], []],
      ['same', 'same', null],
    );

    await expect(
      createTwentyRepository(client).findExistingVisits(['v1', 'v2']),
    ).rejects.toThrow('pagination returned no new cursor');
  });

  it('fails instead of returning a partial result when a next page has no cursor', async () => {
    const { client } = fakeClient('websiteVisits', [[{ id: 'a', leadfeederVisitId: 'v1' }], []], [null, null]);

    await expect(
      createTwentyRepository(client).findExistingVisits(['v1']),
    ).rejects.toThrow('pagination returned no new cursor');
  });
});

describe('findOpenTaskTitles', () => {
  it('ignores tasks that are done', async () => {
    const { client } = fakeClient('tasks', [
      [
        { title: 'Review website visitor: A', status: 'TODO' },
        { title: 'Review website visitor: B', status: 'DONE' },
        { title: 'Review website visitor: C', status: null },
      ],
    ]);

    const open = await createTwentyRepository(client).findOpenTaskTitles([
      'Review website visitor: A',
      'Review website visitor: B',
      'Review website visitor: C',
    ]);

    expect([...open]).toEqual(['Review website visitor: A', 'Review website visitor: C']);
  });
});
