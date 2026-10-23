import { describe, expect, it, vi } from "vitest"

import {
  isShortCode,
  resolveShortCode,
  shortenResultUrl,
} from "@/lib/short-link"
import { buildSnapshot, encodeSnapshot } from "@/lib/snapshot"

const LONG = "https://sorteio.blue/r/abc.def"

function respond(body: string, status = 200) {
  return vi.fn(
    async () => new Response(body, { status })
  ) as unknown as typeof fetch
}

describe("shortenResultUrl", () => {
  it("keeps the site origin and swaps in the da.gd code", async () => {
    const fetchImpl = respond("https://da.gd/Qj7XT\n")
    await expect(shortenResultUrl(LONG, fetchImpl)).resolves.toEqual({
      url: "https://sorteio.blue/s/Qj7XT",
      shortened: true,
    })
    const called = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0]
    expect(called).toBe(`https://da.gd/s?url=${encodeURIComponent(LONG)}`)
  })

  it.each([
    ["an HTTP error", respond("Error", 500)],
    ["a foreign host", respond("https://evil.example/Qj7XT")],
    ["a missing code", respond("https://da.gd/")],
    ["garbage", respond("not a url")],
    [
      "a network failure",
      vi.fn(async () => {
        throw new Error("offline")
      }) as unknown as typeof fetch,
    ],
  ])("falls back to the full URL on %s", async (_name, fetchImpl) => {
    await expect(shortenResultUrl(LONG, fetchImpl)).resolves.toEqual({
      url: LONG,
      shortened: false,
    })
  })

  it("shortens a 10-winner signed result URL", async () => {
    vi.stubEnv("SNAPSHOT_SECRET", "test-snapshot-secret-0123456789abcdef")
    const encoded = encodeSnapshot(
      buildSnapshot({
        creatorDid: "did:plc:host",
        title: "Giveaway with a fairly long title",
        postUri: "at://did:plc:author/app.bsky.feed.post/3kabcdefghijk",
        postHandle: "author.bsky.social",
        mode: "and",
        totalLikes: 1234,
        totalReposts: 567,
        winners: Array.from({ length: 10 }, (_, i) => ({
          did: `did:plc:winner${i}abcdefghijklmnop`,
          h: `winner-number-${i}.bsky.social`,
          n: `Winner Display Name ${i}`,
        })),
      })
    )
    const longUrl = `https://sorteio.blue/r/${encoded}`
    expect(longUrl.length).toBeLessThan(8000)
    const result = await shortenResultUrl(
      longUrl,
      respond("https://da.gd/abcDEF")
    )
    expect(result.shortened).toBe(true)
  })
})

describe("resolveShortCode", () => {
  const origin = "https://sorteio.blue"

  it("returns the result path for the same origin", async () => {
    await expect(
      resolveShortCode("Qj7XT", origin, respond(`${LONG}?dev=1`))
    ).resolves.toBe("/r/abc.def?dev=1")
  })

  it.each([
    ["another origin", "https://skypicker.site/r/abc.def"],
    ["a non-result path", "https://sorteio.blue/api/oauth/logout"],
    ["an off-site target", "https://evil.example/r/abc.def"],
  ])("rejects %s", async (_name, target) => {
    await expect(
      resolveShortCode("Qj7XT", origin, respond(target))
    ).resolves.toBeNull()
  })

  it("rejects malformed codes without calling da.gd", async () => {
    const fetchImpl = respond(LONG)
    await expect(
      resolveShortCode("../x", origin, fetchImpl)
    ).resolves.toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("returns null when da.gd fails", async () => {
    await expect(
      resolveShortCode("Qj7XT", origin, respond("nope", 404))
    ).resolves.toBeNull()
  })
})

describe("isShortCode", () => {
  it("accepts da.gd codes only", () => {
    expect(isShortCode("Qj7XT")).toBe(true)
    expect(isShortCode("abc")).toBe(false)
    expect(isShortCode("a/b/c/d")).toBe(false)
  })
})
