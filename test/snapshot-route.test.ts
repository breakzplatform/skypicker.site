import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { decodeSnapshot } from "@/lib/snapshot"

const session = vi.hoisted(() => ({ did: null as string | null }))
vi.mock("@/lib/atproto", () => ({
  getCurrentDid: async () => session.did,
}))

const { POST } = await import("@/app/api/snapshot/route")

const body = {
  title: "Giveaway",
  postUri: "at://did:plc:author/app.bsky.feed.post/3kabc",
  postHandle: "author.bsky.social",
  mode: "and",
  totalLikes: 10,
  totalReposts: 4,
  winners: [{ did: "did:plc:w1", handle: "w1.bsky.social", displayName: "W" }],
}

function req(payload: unknown) {
  return new NextRequest("https://skypicker.site/api/snapshot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  })
}

describe("POST /api/snapshot", () => {
  beforeEach(() => {
    vi.stubEnv("SNAPSHOT_SECRET", "test-snapshot-secret-0123456789abcdef")
    session.did = "did:plc:host"
  })

  it("refuses anonymous callers", async () => {
    session.did = null
    const res = await POST(req(body))
    expect(res.status).toBe(401)
  })

  it("signs a snapshot that decodes back", async () => {
    const res = await POST(req(body))
    expect(res.status).toBe(200)
    const { id, path } = await res.json()
    expect(path).toBe(`/r/${id}`)
    expect(decodeSnapshot(id)).toMatchObject({
      t: "Giveaway",
      m: "and",
      tl: [10, 4],
      w: [{ did: "did:plc:w1", h: "w1.bsky.social", n: "W" }],
    })
  })

  it.each([
    ["invalid json", "{"],
    ["null body", "null"],
    ["missing fields", { mode: "or" }],
    ["bad mode", { ...body, mode: "everyone" }],
    ["bad post uri", { ...body, postUri: "https://example.com" }],
    ["null winner", { ...body, winners: [null] }],
    ["bad did", { ...body, winners: [{ did: "x", handle: "h" }] }],
    ["non-string title", { ...body, title: 5 }],
  ])("rejects %s with 400", async (_name, payload) => {
    const res = await POST(req(payload))
    expect(res.status).toBe(400)
  })
})
