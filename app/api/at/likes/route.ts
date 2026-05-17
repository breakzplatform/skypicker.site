import { type NextRequest, NextResponse } from "next/server"

import { getCurrentAgent } from "@/lib/atproto"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent()
  if (!agent) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 })
  }

  let body: { uri?: string; cursor?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (!body.uri) {
    return NextResponse.json({ error: "missing uri" }, { status: 400 })
  }

  try {
    const res = await agent.app.bsky.feed.getLikes({
      uri: body.uri,
      cursor: body.cursor || undefined,
      limit: 100,
    })
    return NextResponse.json({
      dids: res.data.likes.map((l) => l.actor.did),
      cursor: res.data.cursor ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
