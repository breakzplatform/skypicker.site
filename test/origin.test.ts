import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { isAllowedHost } from "@/lib/hosts"
import {
  getOriginFromHeaders,
  getOriginFromRequest,
  resolveOrigin,
  UntrustedHostError,
} from "@/lib/oauth/origin"

const headerStore = vi.hoisted(() => ({ current: new Headers() }))
vi.mock("next/headers", () => ({
  headers: async () => headerStore.current,
}))

describe("resolveOrigin", () => {
  beforeEach(() => {
    vi.stubEnv("STAGING_HOSTS", "sp-staging.example.app=skypicker.site")
  })

  it.each([
    ["skypicker.site", null, "https://skypicker.site"],
    ["skypicker.site", "http", "https://skypicker.site"],
    ["SORTEIO.BLUE", "https", "https://sorteio.blue"],
    ["www.sorteio.blue", "https", "https://www.sorteio.blue"],
    ["sp-staging.example.app", "https", "https://sp-staging.example.app"],
    ["skypicker.site:8443", "https", "https://skypicker.site:8443"],
    ["skypicker.site, evil.example.com", "https", "https://skypicker.site"],
    ["localhost:3000", null, "http://localhost:3000"],
    ["127.0.0.1:3000", "http", "http://127.0.0.1:3000"],
    ["[::1]:3000", "https", "https://[::1]:3000"],
    ["localhost:3000", "javascript", "http://localhost:3000"],
  ])("%j (proto %j) -> %s", (host, proto, origin) => {
    expect(resolveOrigin(host, proto)).toBe(origin)
  })

  it.each([
    null,
    "",
    "evil.example.com",
    "skypicker.site.evil.com",
    "evilskypicker.site",
    // Userinfo trick: naive split(":") sees skypicker.site, URL sees evil.com.
    "skypicker.site:443@evil.example.com",
    "skypicker.site@evil.example.com",
    "skypicker.site/evil",
    "skypicker.site\\evil.example.com",
    "skypicker.site evil.example.com",
    "skypicker.site#evil",
    "skypicker.site?x=evil",
    "skypicker.site:abc",
    "skypicker.site.",
    "-skypicker.site",
    "evil.example.com, skypicker.site",
    "localhost.evil.example.com",
    "127.0.0.1.nip.io",
    "10.0.0.1",
    "169.254.169.254",
    "[::ffff:127.0.0.1]",
  ])("rejects hostile host %j", (host) => {
    expect(() => resolveOrigin(host, "https")).toThrow(UntrustedHostError)
    if (host) expect(isAllowedHost(host)).toBe(false)
  })

  it("never produces an origin whose URL host differs from the header", () => {
    for (const host of ["skypicker.site", "www.sorteio.blue:444"]) {
      const origin = resolveOrigin(host, "https")
      expect(new URL(origin).host).toBe(host)
    }
  })
})

describe("getOriginFromRequest", () => {
  it("prefers x-forwarded-host and validates it", () => {
    const ok = new NextRequest("http://internal.invalid/api/oauth/login", {
      headers: {
        host: "internal.invalid",
        "x-forwarded-host": "sorteio.blue",
        "x-forwarded-proto": "https",
      },
    })
    expect(getOriginFromRequest(ok)).toBe("https://sorteio.blue")

    const bad = new NextRequest("http://skypicker.site/api/oauth/login", {
      headers: { host: "skypicker.site", "x-forwarded-host": "evil.example" },
    })
    expect(() => getOriginFromRequest(bad)).toThrow(UntrustedHostError)
  })
})

describe("getOriginFromHeaders", () => {
  it("reads next/headers", async () => {
    headerStore.current = new Headers({ host: "skypicker.site" })
    await expect(getOriginFromHeaders()).resolves.toBe("https://skypicker.site")
    headerStore.current = new Headers({ host: "evil.example.com" })
    await expect(getOriginFromHeaders()).rejects.toThrow(UntrustedHostError)
    headerStore.current = new Headers()
    await expect(getOriginFromHeaders()).rejects.toThrow(UntrustedHostError)
  })
})
