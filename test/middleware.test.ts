import { NextRequest } from "next/server"
import { middleware } from "@/middleware"
import { beforeEach, describe, expect, it, vi } from "vitest"

function request(
  path: string,
  host: string,
  extra: Record<string, string> = {}
) {
  return new NextRequest(`http://${host}${path}`, {
    headers: { host, ...extra },
  })
}

/** The rewrite target and forwarded site header, or the plain status. */
function outcome(res: Response | undefined) {
  if (!res) return { passthrough: true }
  const rewrite = res.headers.get("x-middleware-rewrite")
  if (rewrite) {
    const url = new URL(rewrite)
    return {
      rewrite: url.pathname + url.search,
      site: res.headers.get("x-middleware-request-x-site-domain"),
    }
  }
  return {
    status: res.status,
    site: res.headers.get("x-middleware-request-x-site-domain"),
  }
}

describe("middleware", () => {
  beforeEach(() => {
    vi.stubEnv("STAGING_HOSTS", "sp-staging.example.app=sorteio.blue")
    vi.stubEnv("DEV_DOMAIN", undefined)
  })

  it.each([
    ["skypicker.site", "/", "/skypicker.site", "skypicker.site"],
    ["sorteio.blue", "/", "/sorteio.blue", "sorteio.blue"],
    ["sorteio.blue", "/?a=1", "/sorteio.blue?a=1", "sorteio.blue"],
    ["sp-staging.example.app", "/", "/sorteio.blue", "sorteio.blue"],
  ])("rewrites %s%s to %s", (host, path, rewrite, site) => {
    expect(outcome(middleware(request(path, host)))).toEqual({ rewrite, site })
  })

  it.each([
    "evil.example.com",
    "skypicker.site.evil.com",
    "evilskypicker.site",
    "staging.example.app",
  ])("rejects unknown host %s with 400", (host) => {
    expect(outcome(middleware(request("/", host)))).toMatchObject({
      status: 400,
    })
  })

  it("trusts x-forwarded-host over host", () => {
    const res = middleware(
      request("/", "skypicker.site", { "x-forwarded-host": "evil.example.com" })
    )
    expect(outcome(res)).toMatchObject({ status: 400 })
  })

  it("serves loopback hosts with DEV_DOMAIN or the default", () => {
    expect(outcome(middleware(request("/", "localhost:3000")))).toEqual({
      rewrite: "/skypicker.site",
      site: "skypicker.site",
    })
    vi.stubEnv("DEV_DOMAIN", "sorteio.blue")
    expect(outcome(middleware(request("/", "127.0.0.1:3000")))).toEqual({
      rewrite: "/sorteio.blue",
      site: "sorteio.blue",
    })
  })

  it("honours a known dev_domain override and strips it", () => {
    const res = middleware(
      request("/?dev_domain=sorteio.blue&x=1", "localhost:3000")
    )
    expect(outcome(res)).toEqual({
      rewrite: "/sorteio.blue?x=1",
      site: "sorteio.blue",
    })
  })

  it("does not rewrite to an unknown dev_domain", () => {
    const res = middleware(request("/?dev_domain=evil.com", "localhost:3000"))
    expect(outcome(res)).toEqual({ passthrough: true })
  })

  it("forwards the domain for already-routed paths", () => {
    expect(
      outcome(middleware(request("/sorteio.blue", "skypicker.site")))
    ).toEqual({ status: 200, site: "sorteio.blue" })
  })

  it("falls back to the default domain for an unknown DEV_DOMAIN", () => {
    vi.stubEnv("DEV_DOMAIN", "evil.example.com")
    expect(outcome(middleware(request("/", "localhost:3000")))).toEqual({
      rewrite: "/skypicker.site",
      site: "skypicker.site",
    })
  })

  it.each([
    "/api/oauth/login",
    "/api/oauth/callback",
    "/api/at/likes",
    "/api/snapshot",
    "/r/abc.def",
    "/client-metadata.json",
    "/sorteio.blue",
  ])("rejects hostile hosts on %s", (path) => {
    for (const host of [
      "evil.example.com",
      "skypicker.site:443@evil.example.com",
    ]) {
      expect(
        outcome(
          middleware(
            request(path, "skypicker.site", {
              "x-forwarded-host": host,
            })
          )
        )
      ).toMatchObject({ status: 400 })
    }
  })

  it.each(["/api/oauth/login", "/r/abc.def", "/client-metadata.json"])(
    "passes %s through untouched",
    (path) => {
      expect(outcome(middleware(request(path, "skypicker.site")))).toEqual({
        passthrough: true,
      })
    }
  )
})
