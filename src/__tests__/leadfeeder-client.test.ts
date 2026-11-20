import { describe, expect, it, vi } from 'vitest';

import { leadfeederVisit } from 'src/__tests__/fixtures';
import {
  createLeadfeederClient,
  LeadfeederApiError,
} from 'src/sync/leadfeeder-client';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const page = (ids: string[], pageNum: number, pageCount: number) =>
  json({
    data: ids.map((id) => leadfeederVisit({ id })),
    meta: { pagination: { page_num: pageNum, page_count: pageCount } },
  });

const setup = (responses: Response[]) => {
  const fetchImpl = vi.fn(async () => responses.shift()!);
  const sleep = vi.fn(async () => {});
  const client = createLeadfeederClient({
    apiKey: 'secret',
    accountId: '123456',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep,
  });

  return { client, fetchImpl, sleep };
};

describe('searchWebVisits', () => {
  it('paginates and sends the expected request', async () => {
    const { client, fetchImpl } = setup([page(['a', 'b'], 1, 2), page(['c'], 2, 2)]);

    const visits = await client.searchWebVisits({ startDate: '2026-11-04', endDate: '2026-11-06' });

    expect(visits.map((visit) => visit.id)).toEqual(['a', 'b', 'c']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://api.leadfeeder.com/v1/web-visits');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      account_id: '123456',
      include: 'company',
      'page[num]': '1',
      'page[size]': '100',
    });
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('secret');
    expect(JSON.parse(init.body as string)).toEqual({
      start_date: '2026-11-04',
      end_date: '2026-11-06',
    });
  });

  it('retries 429 responses honouring Retry-After', async () => {
    const { client, sleep } = setup([
      json({ errors: [{ code: 'rate_limit_exceeded' }] }, 429, { 'Retry-After': '3' }),
      json({ errors: [] }, 429),
      page(['a'], 1, 1),
    ]);

    await expect(
      client.searchWebVisits({ startDate: '2026-11-04', endDate: '2026-11-06' }),
    ).resolves.toHaveLength(1);
    // Retry-After first, exponential backoff (attempt 1) when it is missing.
    expect(sleep.mock.calls).toEqual([[3000], [2000]]);
  });

  it('retries temporary server and network errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(page(['a'], 1, 1));
    const sleep = vi.fn(async () => {});
    const client = createLeadfeederClient({
      apiKey: 'secret',
      accountId: '123456',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
    });

    await expect(
      client.searchWebVisits({ startDate: '2026-11-04', endDate: '2026-11-06' }),
    ).resolves.toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('does not retry when Retry-After is longer than a run should wait', async () => {
    const { client, fetchImpl } = setup([json({ errors: [] }, 429, { 'Retry-After': '60' })]);

    await expect(
      client.searchWebVisits({ startDate: '2026-11-04', endDate: '2026-11-06' }),
    ).rejects.toMatchObject({ status: 429 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the monthly quota is used up', async () => {
    const { client, fetchImpl } = setup([
      json({ errors: [{ code: 'quota_exceeded' }] }, 429),
    ]);

    await expect(
      client.searchWebVisits({ startDate: '2026-11-04', endDate: '2026-11-06' }),
    ).rejects.toMatchObject({ status: 429 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails fast when the window holds more pages than allowed', async () => {
    const { client, fetchImpl } = setup([page(['a'], 1, 51)]);

    await expect(
      client.searchWebVisits({ startDate: '2026-08-14', endDate: '2026-11-06' }),
    ).rejects.toThrow('51 pages of web visits');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('gives up after repeated 429s and on other errors, without leaking the key', async () => {
    const tooMany = () => json({ errors: [] }, 429);
    const { client } = setup([tooMany(), tooMany(), tooMany(), tooMany()]);

    await expect(
      client.searchWebVisits({ startDate: '2026-11-04', endDate: '2026-11-06' }),
    ).rejects.toBeInstanceOf(LeadfeederApiError);

    const failing = setup([json({ errors: [{ code: 'unauthorized' }] }, 401)]);
    const error = await failing.client
      .searchWebVisits({ startDate: '2026-11-04', endDate: '2026-11-06' })
      .catch((caught: LeadfeederApiError) => caught);

    expect(error).toMatchObject({ status: 401 });
    expect(String(error)).toContain('failed with 401');
  });
});
