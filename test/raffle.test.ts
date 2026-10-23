import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildPool,
  clampWinnerCount,
  collectParticipants,
  MAX_WINNERS,
  MIN_WINNERS,
  pickWinners,
  secureRandomInt,
  type FilterMode,
} from "@/lib/raffle"

const LIKES = ["did:plc:a", "did:plc:b", "did:plc:c", "did:plc:b"]
const REPOSTS = ["did:plc:c", "did:plc:d", "did:plc:a", "did:plc:d"]

describe("buildPool", () => {
  it.each<[FilterMode, string[]]>([
    ["and", ["did:plc:a", "did:plc:c"]],
    ["or", ["did:plc:a", "did:plc:b", "did:plc:c", "did:plc:d"]],
    ["likes", ["did:plc:a", "did:plc:b", "did:plc:c"]],
    ["reposts", ["did:plc:c", "did:plc:d", "did:plc:a"]],
  ])("mode %s", (mode, expected) => {
    expect(buildPool(LIKES, REPOSTS, mode)).toEqual(expected)
  })

  it("is empty when nobody qualifies", () => {
    expect(buildPool(["did:plc:a"], ["did:plc:b"], "and")).toEqual([])
    expect(buildPool([], [], "or")).toEqual([])
  })
})

describe("clampWinnerCount", () => {
  it.each<[unknown, number]>([
    [1, 1],
    [3, 3],
    ["25", 25],
    [1000, 1000],
    [1001, 1000],
    [1e9, 1000],
    [0, 1],
    [-4, 1],
    [2.9, 2],
    ["", 1],
    ["abc", 1],
    [NaN, 1],
    [Infinity, 1],
    [undefined, 1],
  ])("%j -> %j", (input, expected) => {
    expect(clampWinnerCount(input)).toBe(expected)
  })

  it("matches the documented range", () => {
    expect([MIN_WINNERS, MAX_WINNERS]).toEqual([1, 1000])
  })
})

describe("pickWinners", () => {
  const pool = Array.from({ length: 50 }, (_, i) => `did:plc:p${i}`)

  it.each([1, 7, 50])("draws %i distinct members of the pool", (n) => {
    const winners = pickWinners(pool, n)
    expect(winners).toHaveLength(n)
    expect(new Set(winners).size).toBe(n)
    for (const w of winners) expect(pool).toContain(w)
  })

  it("returns the whole pool when N exceeds it", () => {
    const winners = pickWinners(pool.slice(0, 3), 1000)
    expect([...winners].sort()).toEqual(pool.slice(0, 3).sort())
  })

  it.each([0, -1, NaN])("returns nothing for count %j", (n) => {
    expect(pickWinners(pool, n)).toEqual([])
  })

  it("returns nothing for an empty pool", () => {
    expect(pickWinners([], 5)).toEqual([])
  })

  it("does not mutate the pool", () => {
    const copy = pool.slice()
    pickWinners(pool, 10)
    expect(pool).toEqual(copy)
  })

  it("handles the maximum N on a large pool", () => {
    const big = Array.from({ length: 5000 }, (_, i) => `did:plc:x${i}`)
    const winners = pickWinners(big, MAX_WINNERS)
    expect(new Set(winners).size).toBe(MAX_WINNERS)
  })

  it("follows the injected RNG (Fisher–Yates)", () => {
    // Always pick the last remaining index.
    const last = (max: number) => max - 1
    expect(pickWinners(["a", "b", "c", "d"], 2, last)).toEqual(["d", "a"])
    const first = () => 0
    expect(pickWinners(["a", "b", "c", "d"], 3, first)).toEqual(["a", "b", "c"])
  })

  it("is uniform: every position equally likely to win", () => {
    const small = ["a", "b", "c", "d", "e"]
    const runs = 50_000
    const counts = new Map<string, number>()
    for (let i = 0; i < runs; i++) {
      const [w] = pickWinners(small, 1)
      counts.set(w, (counts.get(w) ?? 0) + 1)
    }
    const expected = runs / small.length
    // Chi-square, 4 degrees of freedom: p = 0.001 at 18.47.
    let chi = 0
    for (const d of small)
      chi += ((counts.get(d) ?? 0) - expected) ** 2 / expected
    expect(chi).toBeLessThan(18.47)
  })

  it("is uniform over unordered pairs", () => {
    const small = ["a", "b", "c", "d"]
    const runs = 60_000
    const counts = new Map<string, number>()
    for (let i = 0; i < runs; i++) {
      const key = pickWinners(small, 2).sort().join("")
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(6)
    const expected = runs / 6
    // Chi-square, 5 degrees of freedom: p = 0.001 at 20.52.
    let chi = 0
    for (const c of counts.values()) chi += (c - expected) ** 2 / expected
    expect(chi).toBeLessThan(20.52)
  })
})

describe("secureRandomInt", () => {
  afterEach(() => vi.restoreAllMocks())

  it("stays in range", () => {
    for (let i = 0; i < 1000; i++) {
      const v = secureRandomInt(7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it("rejects values in the biased tail instead of folding them", () => {
    // 2^32 % 3 === 1, so 0xffffffff is the one biased value for max = 3.
    const values = [0xffffffff, 5]
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((<
      T extends ArrayBufferView | null,
    >(
      buf: T
    ): T => {
      ;(buf as unknown as Uint32Array)[0] = values.shift()!
      return buf
    }) as typeof globalThis.crypto.getRandomValues)
    expect(secureRandomInt(3)).toBe(2)
    expect(values).toEqual([])
  })

  it.each([0, -1, 1.5, NaN, 2 ** 33])("rejects range %j", (max) => {
    expect(() => secureRandomInt(max)).toThrow(RangeError)
  })
})

describe("collectParticipants", () => {
  const pages: Record<
    string,
    Array<{ dids: string[]; cursor: string | null }>
  > = {
    "/api/at/likes": [
      { dids: ["did:plc:a", "did:plc:b"], cursor: "p2" },
      { dids: ["did:plc:c"], cursor: null },
    ],
    "/api/at/reposts": [{ dids: ["did:plc:c", "did:plc:d"], cursor: null }],
  }

  function mockFetch(rateLimitFirst = false) {
    const calls: Array<{ url: string; body: unknown }> = []
    let limited = rateLimitFirst
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body))
        calls.push({ url, body })
        if (limited) {
          limited = false
          return new Response("{}", {
            status: 429,
            headers: { "retry-after": "2" },
          })
        }
        const page = body.cursor === "p2" ? 1 : 0
        return Response.json(pages[url][page])
      })
    )
    return calls
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it.each<[FilterMode, string[], number, number]>([
    ["or", ["did:plc:a", "did:plc:b", "did:plc:c", "did:plc:d"], 3, 2],
    ["and", ["did:plc:c"], 3, 2],
    ["likes", ["did:plc:a", "did:plc:b", "did:plc:c"], 3, 0],
    ["reposts", ["did:plc:c", "did:plc:d"], 0, 2],
  ])("mode %s pages through the proxies", async (mode, pool, tl, tr) => {
    const calls = mockFetch()
    const progress = vi.fn()
    const result = await collectParticipants(
      "at://did:plc:x/app.bsky.feed.post/1",
      mode,
      new AbortController().signal,
      progress
    )
    expect(result).toEqual({ pool, totalLikes: tl, totalReposts: tr })
    expect(calls[0].body).toMatchObject({ cursor: null })
    if (mode === "likes") {
      expect(calls.every((c) => c.url === "/api/at/likes")).toBe(true)
    }
    if (mode === "reposts") {
      expect(calls.every((c) => c.url === "/api/at/reposts")).toBe(true)
    }
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ likesDone: true, repostsDone: true })
    )
  })

  it("waits out a 429 and resumes", async () => {
    vi.useFakeTimers()
    const calls = mockFetch(true)
    const done = collectParticipants(
      "at://did:plc:x/app.bsky.feed.post/1",
      "likes",
      new AbortController().signal,
      () => {}
    )
    await vi.advanceTimersByTimeAsync(1999)
    expect(calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(done).resolves.toMatchObject({ totalLikes: 3 })
  })

  it("stops when aborted", async () => {
    mockFetch()
    const controller = new AbortController()
    controller.abort()
    await expect(
      collectParticipants(
        "at://did:plc:x/app.bsky.feed.post/1",
        "or",
        controller.signal,
        () => {}
      )
    ).rejects.toThrow(/abort/)
  })
})
