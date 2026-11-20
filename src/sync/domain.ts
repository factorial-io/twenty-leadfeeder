import { domainToUnicode } from 'node:url';

// Profile domains (and their subdomains) that many companies share: a URL like
// linkedin.com/company/acme must not match a Twenty company by "linkedin.com".
const SHARED_DOMAINS = new Set([
  'facebook.com',
  'github.com',
  'google.com',
  'instagram.com',
  'linkedin.com',
  'medium.com',
  'twitter.com',
  'x.com',
  'xing.com',
  'youtube.com',
]);

const toAsciiHost = (host: string): string | null => {
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
};

// Returns the bare host in lowercase ASCII (IDNs in punycode), without scheme,
// credentials, port, path or a leading "www.", or null for anything else.
export const normalizeDomain = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const rawHost = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^\/\//, '')
    .split(/[/?#\s]/)[0]
    .replace(/^[^@]*@/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');

  if (rawHost === '') {
    return null;
  }

  const host = toAsciiHost(rawHost)?.replace(/^www\d*\./, '') ?? null;

  // The last label must look like a TLD, which also rules out IP addresses.
  if (!host || !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.(?:[a-z]{2,}|xn--[a-z0-9-]+)$/.test(host)) {
    return null;
  }

  const isShared = [...SHARED_DOMAINS].some(
    (shared) => host === shared || host.endsWith(`.${shared}`),
  );

  return isShared ? null : host;
};

export const uniqueDomains = (
  values: ReadonlyArray<string | null | undefined>,
): string[] => {
  const domains = values
    .map(normalizeDomain)
    .filter((domain): domain is string => domain !== null);

  return [...new Set(domains)];
};

// Substrings to search the Company domain field with: the stored value may be
// any spelling (case, scheme, www., path, Unicode), so candidates are matched
// loosely and then confirmed by normalising them again.
export const domainSearchTerms = (domain: string): string[] => {
  const unicode = domainToUnicode(domain);

  return unicode && unicode !== domain ? [domain, unicode] : [domain];
};
