import { type NextRequest, NextResponse } from "next/server"

import { getCurrentAgent } from "@/lib/atproto"

export const dynamic = "force-dynamic"

const BSKY_ORIGIN = "https://bsky.app"

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent()
  if (!agent) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 })
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const raw = typeof body.url === "string" ? body.url.trim() : ""
  if (!raw) {
    return NextResponse.json({ error: "invalid post url" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return NextResponse.json({ error: "invalid post url" }, { status: 400 })
  }
  if (parsed.origin !== BSKY_ORIGIN) {
    return NextResponse.json({ error: "invalid post url" }, { status: 400 })
  }
  const parts = parsed.pathname.split("/").filter(Boolean)
  if (parts.length !== 4 || parts[0] !== "profile" || parts[2] !== "post") {
    return NextResponse.json({ error: "invalid post url" }, { status: 400 })
  }
  const handle = parts[1]
  const postId = parts[3]

  try {
    const profile = await agent.app.bsky.actor.getProfile({ actor: handle })
    const did = profile.data.did
    const uri = `at://${did}/app.bsky.feed.post/${postId}`
    return NextResponse.json({
      uri,
      authorDid: did,
      authorHandle: profile.data.handle,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
