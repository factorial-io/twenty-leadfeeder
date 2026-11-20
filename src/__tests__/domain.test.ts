import { describe, expect, it } from 'vitest';

import {
  domainSearchTerms,
  normalizeDomain,
  uniqueDomains,
} from 'src/sync/domain';

describe('normalizeDomain', () => {
  it.each([
    ['https://www.kabel-sterner.de/Impressum', 'kabel-sterner.de'],
    ['http://www.apazmedikal.com', 'apazmedikal.com'],
    ['https://apazmedikal.com', 'apazmedikal.com'],
    ['https://datef.it/de/', 'datef.it'],
    ['WWW.Example.COM', 'example.com'],
    ['HTTPS://WWW.EXAMPLE.COM/EN', 'example.com'],
    ['example.com/', 'example.com'],
    ['https://example.com:8443/path?q=1#x', 'example.com'],
    ['//www2.example.co.uk', 'example.co.uk'],
    ['https://user@example.com', 'example.com'],
    ['  https://example.com.  ', 'example.com'],
    ['https://shop.example.com', 'shop.example.com'],
    ['https://müller-bau.de', 'xn--mller-bau-q9a.de'],
    ['xn--mller-bau-q9a.de', 'xn--mller-bau-q9a.de'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each([null, undefined, '', '   ', 'not a domain', 'https://', 'localhost', '1234', 'http://10.0.0.1/'])(
    'returns null for %s',
    (input) => {
      expect(normalizeDomain(input)).toBeNull();
    },
  );

  it.each([
    'https://www.linkedin.com/company/acme',
    'facebook.com/acme',
    'https://xing.com/pages/acme',
    'https://de.linkedin.com/company/acme',
    'm.facebook.com/acme',
  ])('ignores shared profile domains and their subdomains: %s', (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});

describe('uniqueDomains', () => {
  it('merges url and alternative urls without duplicates', () => {
    expect(
      uniqueDomains([
        'http://www.apazmedikal.com',
        'https://apazmedikal.com',
        null,
        'https://apaz.de',
        'https://www.linkedin.com/company/apaz',
      ]),
    ).toEqual(['apazmedikal.com', 'apaz.de']);
  });
});

describe('domainSearchTerms', () => {
  it('searches ASCII domains as they are', () => {
    expect(domainSearchTerms('acme.de')).toEqual(['acme.de']);
  });

  it('searches IDNs in punycode and Unicode spelling', () => {
    expect(domainSearchTerms('xn--mller-bau-q9a.de')).toEqual([
      'xn--mller-bau-q9a.de',
      'müller-bau.de',
    ]);
  });
});
