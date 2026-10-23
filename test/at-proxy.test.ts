import { NextRequest } from "next/server"
import { XRPCError } from "@atproto/api"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  isCursor,
  isPostUri,
  parseBskyPostUrl,
  retryAfterSeconds,
  upstreamErrorResponse,
} from "@/lib/at-proxy"

const agent = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}))
vi.mock("@/lib/atproto", () => ({
  getCurrentAgent: async () => agent.current,
}))

const { POST: likes } = await import("@/app/api/at/likes/route")
const { POST: reposts } = await import("@/app/api/at/reposts/route")
const { POST: post } = await import("@/app/api/at/post/route")
const { POST: profiles } = await import("@/app/api/at/profiles/route")

const URI = "at://did:plc:abc123/app.bsky.feed.post/3kxyz"

function req(body: unknown) {
  return new NextRequest("https://skypicker.site/api/at/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

describe("validators", () => {
  it.each([
    [URI, true],
    ["at://did:web:example.com/app.bsky.feed.post/abc", true],
    ["at://handle.bsky.social/app.bsky.feed.post/abc", false],
    ["at://did:plc:abc/app.bsky.feed.like/abc", false],
    ["at://did:plc:abc/app.bsky.feed.post/abc/extra", false],
    ["at://did:plc:abc/app.bsky.feed.post/..", false],
    ["at://did:plc:abc/app.bsky.feed.post/a?b", false],
    ["https://bsky.app", false],
    [`at://did:plc:abc/app.bsky.feed.post/${"a".repeat(2000)}`, false],
    [42, false],
  ])("isPostUri(%j) = %s", (v, ok) => {
    expect(isPostUri(v)).toBe(ok)
  })

  it("accepts null, undefined and short string cursors", () => {
    expect(isCursor(null)).toBe(true)
    expect(isCursor(undefined)).toBe(true)
    expect(isCursor("3kabc::xyz")).toBe(true)
    expect(isCursor("x".repeat(2000))).toBe(false)
    expect(isCursor(5)).toBe(false)
    expect(isCursor({})).toBe(false)
  })

  it.each([
    [
      "https://bsky.app/profile/alice.bsky.social/post/3kabc",
      { actor: "alice.bsky.social", rkey: "3kabc" },
    ],
    [
      " https://bsky.app/profile/did:plc:abc123/post/3kabc/?ref=x#y ",
      { actor: "did:plc:abc123", rkey: "3kabc" },
    ],
    [
      "https://bsky.app/profile/did%3Aplc%3Aabc123/post/3kabc",
      { actor: "did:plc:abc123", rkey: "3kabc" },
    ],
  ])("parses %s", (url, parsed) => {
    expect(parseBskyPostUrl(url)).toEqual(parsed)
  })

  it.each([
    "",
    "not a url",
    "https://user:pw@bsky.app/profile/alice.bsky.social/post/3kabc",
    "https://bsky.app/profile/alice.bsky.social",
    "https://bsky.app/profile/alice.bsky.social/feed/3kabc",
    "https://bsky.app/profile/http:%2F%2F169.254.169.254/post/3kabc",
    "https://bsky.app/profile/alice.bsky.social/post/..",
    "https://bsky.app/profile/%E0%A4%A/post/3kabc",
    "javascript:alert(1)",
  ])("rejects %j", (url) => {
    expect(parseBskyPostUrl(url)).toBeNull()
  })
  it.each([
    "http://bsky.app/profile/alice.bsky.social/post/3kabc",
    "https://evil.example/profile/alice.bsky.social/post/3kabc",
    "https://bsky.app.evil.example/profile/a.b/post/3kabc",
    "https://bsky.app:444/profile/alice.bsky.social/post/3kabc",
  ])("accepts a compatible route on %s", (url) => {
    expect(parseBskyPostUrl(url)?.rkey).toBe("3kabc")
  })
  it("rejects non-strings", () => {
    expect(parseBskyPostUrl(undefined)).toBeNull()
    expect(parseBskyPostUrl({ href: "https://bsky.app" })).toBeNull()
  })

  it("derives Retry-After from upstream headers", () => {
    const now = Date.parse("2026-10-14T00:00:00Z")
    expect(retryAfterSeconds({ "Retry-After": "7" }, now)).toBe(7)
    expect(
      retryAfterSeconds({ "ratelimit-reset": String(now / 1000 + 42) }, now)
    ).toBe(42)
    expect(retryAfterSeconds({ "retry-after": "99999" }, now)).toBe(120)
    expect(retryAfterSeconds({ "retry-after": "-3" }, now)).toBe(1)
    expect(retryAfterSeconds(undefined, now)).toBe(5)
  })

  it("maps upstream errors", async () => {
    const limited = upstreamErrorResponse(
      new XRPCError(429, "RateLimitExceeded", "slow down", {
        "retry-after": "12",
      })
    )
    expect(limited.status).toBe(429)
    expect(limited.headers.get("retry-after")).toBe("12")

    const missing = upstreamErrorResponse(
      new XRPCError(400, "InvalidRequest", "Profile not found")
    )
    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: "Profile not found" })

    expect(upstreamErrorResponse(new XRPCError(500)).status).toBe(502)
    expect(upstreamErrorResponse("boom").status).toBe(502)
  })
})

describe("/api/at routes", () => {
  const getLikes = vi.fn()
  const getRepostedBy = vi.fn()
  const getProfile = vi.fn()
  const getProfiles = vi.fn()

  beforeEach(() => {
    getLikes.mockReset()
    getRepostedBy.mockReset()
    getProfile.mockReset()
    getProfiles.mockReset()
    agent.current = {
      app: {
        bsky: {
          feed: { getLikes, getRepostedBy },
          actor: { getProfile, getProfiles },
        },
      },
    }
  })

  it("require a session", async () => {
    agent.current = null
    for (const route of [likes, reposts, post, profiles]) {
      expect((await route(req({}))).status).toBe(401)
    }
  })

  it("reject invalid JSON", async () => {
    expect((await likes(req("{nope"))).status).toBe(400)
  })

  it("accept the first page's null cursor", async () => {
    getLikes.mockResolvedValue({
      data: { likes: [{ actor: { did: "did:plc:a" } }], cursor: "next" },
    })
    const res = await likes(req({ uri: URI, cursor: null }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ dids: ["did:plc:a"], cursor: "next" })
    expect(getLikes).toHaveBeenCalledWith({
      uri: URI,
      cursor: undefined,
      limit: 100,
    })
  })

  it("pass the cursor through for later pages", async () => {
    getRepostedBy.mockResolvedValue({
      data: { repostedBy: [{ did: "did:plc:b" }] },
    })
    const res = await reposts(req({ uri: URI, cursor: "abc" }))
    expect(await res.json()).toEqual({ dids: ["did:plc:b"], cursor: null })
    expect(getRepostedBy).toHaveBeenCalledWith({
      uri: URI,
      cursor: "abc",
      limit: 100,
    })
  })

  it("reject non-post URIs before calling upstream", async () => {
    for (const uri of ["at://x", "https://bsky.app", 1, null]) {
      expect((await likes(req({ uri }))).status).toBe(400)
      expect((await reposts(req({ uri }))).status).toBe(400)
    }
    expect(getLikes).not.toHaveBeenCalled()
  })

  it("forward upstream rate limits as 429", async () => {
    getLikes.mockRejectedValue(
      new XRPCError(429, "RateLimitExceeded", "", { "retry-after": "3" })
    )
    const res = await likes(req({ uri: URI }))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("3")
  })

  it("resolve a bsky.app link to an at:// URI via the user's agent", async () => {
    getProfile.mockResolvedValue({
      data: { did: "did:plc:abc123", handle: "alice.bsky.social" },
    })
    const res = await post(
      req({ url: "https://bsky.app/profile/alice.bsky.social/post/3kxyz" })
    )
    expect(await res.json()).toEqual({
      uri: URI,
      authorDid: "did:plc:abc123",
      authorHandle: "alice.bsky.social",
    })
    expect(getProfile).toHaveBeenCalledWith({ actor: "alice.bsky.social" })
  })

  it("resolves the actor without fetching the supplied host", async () => {
    getProfile.mockResolvedValue({
      data: { did: "did:plc:abc123", handle: "a.b" },
    })
    const res = await post(
      req({ url: "https://169.254.169.254/profile/a.b/post/3kxyz" })
    )
    expect(res.status).toBe(200)
    expect(getProfile).toHaveBeenCalledWith({ actor: "a.b" })
    expect(await res.json()).toEqual({
      uri: URI,
      authorDid: "did:plc:abc123",
      authorHandle: "a.b",
    })
  })

  it("validate profile batches", async () => {
    getProfiles.mockResolvedValue({ data: { profiles: [] } })
    expect(await (await profiles(req({ dids: [] }))).json()).toEqual({
      profiles: [],
    })
    const tooMany = Array.from({ length: 26 }, (_, i) => `did:plc:${i}`)
    expect((await profiles(req({ dids: tooMany }))).status).toBe(400)
    expect((await profiles(req({ dids: ["nope"] }))).status).toBe(400)
    expect((await profiles(req({ dids: ["did:plc:a"] }))).status).toBe(200)
    expect(getProfiles).toHaveBeenCalledTimes(1)
  })
})
