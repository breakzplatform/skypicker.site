import content from "@/data/content.json"

import type { KnownDomain } from "./hosts"

export type SiteContent = (typeof content)[KnownDomain]

export function siteContent(domain: KnownDomain): SiteContent {
  return content[domain]
}
