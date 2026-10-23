import { headers } from "next/headers"

import content from "@/data/content.json"

import {
  DEFAULT_DOMAIN,
  isKnownDomain,
  knownDomainForHost,
  SITE_DOMAIN_HEADER,
  type KnownDomain,
} from "./hosts"

export type SiteContent = (typeof content)[KnownDomain]

/**
 * The known domain this request renders. Pages get it from the middleware's
 * rewrite header; routes the middleware passes through (/r/*) fall back to the
 * Host header, which also covers staging aliases.
 */
export async function getSiteDomain(): Promise<KnownDomain> {
  const h = await headers()
  const routed = h.get(SITE_DOMAIN_HEADER)
  if (routed && isKnownDomain(routed)) return routed
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? ""
  return knownDomainForHost(host) ?? DEFAULT_DOMAIN
}

export function siteContent(domain: KnownDomain): SiteContent {
  return content[domain]
}
