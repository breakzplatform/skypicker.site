import content from "@/data/content.json"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_DOMAIN,
  isKnownDomain,
  KNOWN_DOMAINS,
  knownDomainForHost,
  stagingDomainForHost,
} from "@/lib/hosts"
import { siteContent } from "@/lib/site"

const STAGING =
  "sp-staging.example.app=skypicker.site, SB-Staging.example.app = sorteio.blue,bad.example.app=evil.com,=skypicker.site,novalue.example.app"

describe("hosts", () => {
  beforeEach(() => {
    vi.stubEnv("STAGING_HOSTS", STAGING)
  })

  it("knows exactly the two production domains", () => {
    expect([...KNOWN_DOMAINS]).toEqual(["skypicker.site", "sorteio.blue"])
    expect(isKnownDomain("skypicker.site")).toBe(true)
    expect(isKnownDomain("sorteio.blue")).toBe(true)
    expect(isKnownDomain("SKYPICKER.SITE")).toBe(false)
    expect(isKnownDomain("example.com")).toBe(false)
    expect(DEFAULT_DOMAIN).toBe("skypicker.site")
  })

  it.each([
    ["skypicker.site", "skypicker.site"],
    ["SkyPicker.Site", "skypicker.site"],
    ["skypicker.site:443", "skypicker.site"],
    ["www.skypicker.site", "skypicker.site"],
    ["sorteio.blue", "sorteio.blue"],
    ["www.sorteio.blue:8080", "sorteio.blue"],
    ["sp-staging.example.app", "skypicker.site"],
    ["sb-staging.example.app", "sorteio.blue"],
    ["SB-STAGING.example.app:3000", "sorteio.blue"],
  ])("maps %s to %s", (host, domain) => {
    expect(knownDomainForHost(host)).toBe(domain)
  })

  it.each([
    "",
    "example.com",
    "evilskypicker.site",
    "skypicker.site.evil.com",
    "skypicker.sitex",
    "sorteio.blue.example.app",
    "bad.example.app",
    "novalue.example.app",
    "x.sp-staging.example.app",
    "localhost",
    "127.0.0.1",
  ])("rejects %j", (host) => {
    expect(knownDomainForHost(host)).toBeNull()
  })

  it("only maps staging aliases listed in STAGING_HOSTS", () => {
    expect(stagingDomainForHost("sp-staging.example.app")).toBe(
      "skypicker.site"
    )
    expect(stagingDomainForHost("skypicker.site")).toBeNull()
    vi.stubEnv("STAGING_HOSTS", "")
    expect(stagingDomainForHost("sp-staging.example.app")).toBeNull()
    expect(knownDomainForHost("sp-staging.example.app")).toBeNull()
  })

  it("maps each domain to its locale", () => {
    expect(siteContent("skypicker.site").meta.lang).toBe("en")
    expect(siteContent("sorteio.blue").meta.lang).toBe("pt-BR")
    for (const d of KNOWN_DOMAINS) {
      expect(siteContent(d)).toBe(content[d])
    }
  })
})
