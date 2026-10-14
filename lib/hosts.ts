export const KNOWN_DOMAINS = ["skypicker.site", "sorteio.blue"] as const

export type KnownDomain = (typeof KNOWN_DOMAINS)[number]

export function isKnownDomain(value: string): value is KnownDomain {
  return (KNOWN_DOMAINS as readonly string[]).includes(value)
}

/**
 * Extra hosts that serve a known domain's content, e.g. staging aliases.
 * Format: STAGING_HOSTS="skypicker-staging.vercel.app=skypicker.site,sorteio-staging.vercel.app=sorteio.blue"
 * Only exact hostnames are matched; entries naming an unknown domain are ignored.
 */
function stagingHosts(): Map<string, KnownDomain> {
  const hosts = new Map<string, KnownDomain>()
  for (const entry of (process.env.STAGING_HOSTS ?? "").split(",")) {
    const [host, domain] = entry
      .split("=")
      .map((part) => part.trim().toLowerCase())
    if (host && domain && isKnownDomain(domain)) hosts.set(host, domain)
  }
  return hosts
}

function hostname(host: string): string {
  return host.split(":")[0].toLowerCase()
}

export function stagingDomainForHost(host: string): KnownDomain | null {
  return stagingHosts().get(hostname(host)) ?? null
}

/** The known domain a request host serves, or null if the host is not allowed. */
export function knownDomainForHost(host: string): KnownDomain | null {
  const name = hostname(host)
  const known = KNOWN_DOMAINS.find((d) => name === d || name.endsWith(`.${d}`))
  return known ?? stagingDomainForHost(name)
}

const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i

/** DNS hostname with an optional port; no userinfo, path, spaces or commas. */
const DNS_HOST =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?::\d{1,5})?$/i

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOST.test(host)
}

/**
 * Whether a raw Host header value is one this app serves: a loopback host, or
 * a well-formed hostname for a known domain, one of its subdomains or a
 * STAGING_HOSTS alias.
 */
export function isAllowedHost(host: string): boolean {
  return (
    isLoopbackHost(host) || (DNS_HOST.test(host) && !!knownDomainForHost(host))
  )
}

/** Request header the middleware sets to the known domain a page renders. */
export const SITE_DOMAIN_HEADER = "x-site-domain"

export const DEFAULT_DOMAIN: KnownDomain = "skypicker.site"
