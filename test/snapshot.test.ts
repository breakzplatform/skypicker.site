import { createHmac } from "node:crypto"
import { deflateRawSync } from "node:zlib"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildSnapshot,
  decodeSnapshot,
  encodeSnapshot,
  SNAPSHOT_VERSION,
} from "@/lib/snapshot"

// Test-only values, never used anywhere real.
const SECRET_A = "test-secret-a-0123456789abcdefghijklmnop"
const SECRET_B = "test-secret-b-0123456789abcdefghijklmnop"

const baseInput = {
  creatorDid: "did:plc:creator",
  title: "  Spring giveaway  ",
  postUri: "at://did:plc:author123/app.bsky.feed.post/3kabc",
  postHandle: "author.bsky.social",
  mode: "or" as const,
  totalLikes: 42,
  totalReposts: 7,
  winners: [
    { did: "did:plc:winner1", h: "one.bsky.social", n: "One" },
    { did: "did:web:two.example.com", h: "two.example.com" },
  ],
}

function tamperPayload(encoded: string, mutate: (b: Buffer) => void): string {
  const [payload, sig] = encoded.split(".")
  const bytes = Buffer.from(payload, "base64url")
  mutate(bytes)
  return `${bytes.toString("base64url")}.${sig}`
}

describe("snapshot", () => {
  beforeEach(() => {
    vi.stubEnv("SNAPSHOT_SECRET", SECRET_A)
    vi.stubEnv("SESSION_SECRET", "")
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe("buildSnapshot", () => {
    it("normalises the input", () => {
      vi.useFakeTimers({ now: new Date("2026-10-14T12:00:00Z") })
      const s = buildSnapshot({
        ...baseInput,
        totalLikes: 3.9,
        totalReposts: -5,
      })
      expect(s).toEqual({
        v: SNAPSHOT_VERSION,
        c: baseInput.creatorDid,
        t: "Spring giveaway",
        ts: Date.parse("2026-10-14T12:00:00Z"),
        p: baseInput.postUri,
        ph: "author.bsky.social",
        m: "or",
        tl: [3, 0],
        w: [
          { did: "did:plc:winner1", h: "one.bsky.social", n: "One" },
          { did: "did:web:two.example.com", h: "two.example.com" },
        ],
      })
    })

    it("clamps long strings", () => {
      const s = buildSnapshot({
        ...baseInput,
        title: "x".repeat(500),
        winners: [{ did: "did:plc:w", h: "h".repeat(400), n: "n".repeat(400) }],
      })
      expect(s.t).toHaveLength(100)
      expect(s.w[0].h).toHaveLength(253)
      expect(s.w[0].n).toHaveLength(64)
    })

    it.each([
      ["non at:// post uri", { postUri: "https://bsky.app/profile/x/post/y" }],
      ["invalid creator", { creatorDid: "not-a-did" }],
      ["missing creator", { creatorDid: undefined }],
      ["empty post uri", { postUri: "" }],
      ["unknown mode", { mode: "all" }],
      ["no winners", { winners: [] }],
      ["bad did", { winners: [{ did: "not-a-did", h: "x" }] }],
      ["missing handle", { winners: [{ did: "did:plc:x", h: "" }] }],
      [
        "too many winners",
        {
          winners: Array.from({ length: 101 }, (_, i) => ({
            did: `did:plc:w${i}`,
            h: `w${i}.bsky.social`,
          })),
        },
      ],
    ])("rejects %s", (_name, override) => {
      expect(() =>
        buildSnapshot({ ...baseInput, ...(override as object) })
      ).toThrow()
    })
  })

  describe("encode/decode", () => {
    it.each([
      undefined,
      null,
      "",
      "not-a-did",
      42,
      `did:plc:${"a".repeat(321)}`,
    ])("rejects signed snapshots with invalid creator %j", (c) => {
      const payload = deflateRawSync(
        Buffer.from(JSON.stringify({ ...buildSnapshot(baseInput), c }))
      )
      const signature = createHmac(
        "sha256",
        `snapshot-v${SNAPSHOT_VERSION}:${SECRET_A}`
      )
        .update(payload)
        .digest("base64url")
      expect(() =>
        decodeSnapshot(`${payload.toString("base64url")}.${signature}`)
      ).toThrow(/creator/)
    })

    it("rejects creator tampering with the original signature", () => {
      const snapshot = buildSnapshot(baseInput)
      const signature = encodeSnapshot(snapshot).split(".")[1]
      const payload = deflateRawSync(
        Buffer.from(JSON.stringify({ ...snapshot, c: "did:plc:attacker" }))
      )
      expect(() =>
        decodeSnapshot(`${payload.toString("base64url")}.${signature}`)
      ).toThrow(/signature/)
    })

    it("rejects legacy v1 links", () => {
      const payload = deflateRawSync(
        Buffer.from(
          JSON.stringify({ ...buildSnapshot(baseInput), v: 1, c: undefined })
        )
      )
      const signature = createHmac("sha256", `snapshot-v1:${SECRET_A}`)
        .update(payload)
        .digest("base64url")
      expect(() =>
        decodeSnapshot(`${payload.toString("base64url")}.${signature}`)
      ).toThrow()
    })

    it("round-trips", () => {
      const s = buildSnapshot(baseInput)
      const encoded = encodeSnapshot(s)
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
      expect(decodeSnapshot(encoded)).toEqual(s)
    })

    it("round-trips the maximum winner count", () => {
      const s = buildSnapshot({
        ...baseInput,
        winners: Array.from({ length: 100 }, (_, i) => ({
          did: `did:plc:${"a".repeat(24)}${i}`,
          h: `winner-${i}.bsky.social`,
          n: `Winner ${i}`,
        })),
      })
      expect(decodeSnapshot(encodeSnapshot(s))).toEqual(s)
    })

    it("rejects a payload that does not match its signature", () => {
      const encoded = encodeSnapshot(buildSnapshot(baseInput))
      const tampered = tamperPayload(encoded, (b) => {
        b[b.length - 1] ^= 0x01
      })
      expect(() => decodeSnapshot(tampered)).toThrow(/signature/)
    })

    it("rejects a forged payload re-using another signature", () => {
      const real = encodeSnapshot(buildSnapshot(baseInput))
      const forgedJson = JSON.stringify({
        ...buildSnapshot(baseInput),
        w: [{ did: "did:plc:attacker", h: "attacker.bsky.social" }],
      })
      const forgedPayload = deflateRawSync(Buffer.from(forgedJson))
      const forged = `${forgedPayload.toString("base64url")}.${real.split(".")[1]}`
      expect(() => decodeSnapshot(forged)).toThrow(/signature/)
    })

    it("rejects a truncated or altered signature", () => {
      const encoded = encodeSnapshot(buildSnapshot(baseInput))
      const [payload, sig] = encoded.split(".")
      expect(() => decodeSnapshot(`${payload}.${sig.slice(0, -4)}`)).toThrow(
        /signature/
      )
      const flipped = sig[0] === "A" ? `B${sig.slice(1)}` : `A${sig.slice(1)}`
      expect(() => decodeSnapshot(`${payload}.${flipped}`)).toThrow(/signature/)
    })

    it("rejects snapshots signed with another secret", () => {
      const encoded = encodeSnapshot(buildSnapshot(baseInput))
      vi.stubEnv("SNAPSHOT_SECRET", SECRET_B)
      expect(() => decodeSnapshot(encoded)).toThrow(/signature/)
    })

    it.each([undefined, ""])(
      "falls back to SESSION_SECRET when SNAPSHOT_SECRET is %j",
      (value) => {
        vi.stubEnv("SNAPSHOT_SECRET", value)
        vi.stubEnv("SESSION_SECRET", SECRET_B)
        const encoded = encodeSnapshot(buildSnapshot(baseInput))
        expect(decodeSnapshot(encoded).p).toBe(baseInput.postUri)
      }
    )

    it("refuses to sign with a short or missing secret", () => {
      vi.stubEnv("SNAPSHOT_SECRET", "too-short")
      expect(() => encodeSnapshot(buildSnapshot(baseInput))).toThrow(/32/)
      vi.stubEnv("SNAPSHOT_SECRET", undefined)
      vi.stubEnv("SESSION_SECRET", undefined)
      expect(() => encodeSnapshot(buildSnapshot(baseInput))).toThrow(/32/)
    })

    it.each(["", ".", "abc", "abc.", ".abc", "!!!.???"])(
      "rejects malformed input %j",
      (input) => {
        expect(() => decodeSnapshot(input)).toThrow()
      }
    )

    it("rejects oversized payloads before verifying", () => {
      const big = Buffer.alloc(7 * 1024, 1).toString("base64url")
      expect(() => decodeSnapshot(`${big}.AAAA`)).toThrow(/too large/)
    })

    it("does not expire: old snapshots stay valid", () => {
      vi.useFakeTimers({ now: new Date("2020-01-01T00:00:00Z") })
      const encoded = encodeSnapshot(buildSnapshot(baseInput))
      vi.setSystemTime(new Date("2030-01-01T00:00:00Z"))
      expect(decodeSnapshot(encoded).ts).toBe(
        Date.parse("2020-01-01T00:00:00Z")
      )
    })
  })
})

describe("snapshot decompression", () => {
  it("refuses payloads that inflate past the JSON limit", async () => {
    vi.stubEnv("SNAPSHOT_SECRET", SECRET_A)
    const { createHmac } = await import("node:crypto")
    // ~100 kB of JSON compresses to well under the 6 kB payload cap.
    const json = JSON.stringify({
      v: 1,
      m: "or",
      p: "x",
      w: [],
      pad: "a".repeat(100_000),
    })
    const payload = deflateRawSync(Buffer.from(json))
    expect(payload.length).toBeLessThan(6 * 1024)
    const sig = createHmac(
      "sha256",
      `snapshot-v${SNAPSHOT_VERSION}:${SECRET_A}`
    )
      .update(payload)
      .digest()
    expect(() =>
      decodeSnapshot(
        `${payload.toString("base64url")}.${sig.toString("base64url")}`
      )
    ).toThrow(/buffer|length|large/i)
  })
})
