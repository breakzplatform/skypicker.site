import { NextResponse, type NextRequest } from "next/server"

import { isCursor, isPostUri, upstreamErrorResponse } from "@/lib/at-proxy"
import { getCurrentAgent } from "@/lib/atproto"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent()
  if (!agent) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 })
  }

  let body: { uri?: unknown; cursor?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (!body || !isPostUri(body.uri)) {
    return NextResponse.json({ error: "invalid uri" }, { status: 400 })
  }
  if (!isCursor(body.cursor)) {
    return NextResponse.json({ error: "invalid cursor" }, { status: 400 })
  }

  try {
    const res = await agent.app.bsky.feed.getRepostedBy({
      uri: body.uri,
      cursor: body.cursor || undefined,
      limit: 100,
    })
    return NextResponse.json({
      dids: res.data.repostedBy.map((r) => r.did),
      cursor: res.data.cursor ?? null,
    })
  } catch (err) {
    return upstreamErrorResponse(err)
  }
}
