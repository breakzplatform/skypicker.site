import { NextResponse, type NextRequest } from "next/server"

import { parseBskyPostUrl, upstreamErrorResponse } from "@/lib/at-proxy"
import { getCurrentAgent } from "@/lib/atproto"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent()
  if (!agent) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 })
  }

  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  // Only bsky.app post links: the handle is resolved through the signed-in
  // user's PDS, never fetched as a URL, so this cannot reach other hosts.
  const parsed = parseBskyPostUrl(body?.url)
  if (!parsed) {
    return NextResponse.json({ error: "invalid post url" }, { status: 400 })
  }

  try {
    const profile = await agent.app.bsky.actor.getProfile({
      actor: parsed.actor,
    })
    const did = profile.data.did
    const uri = `at://${did}/app.bsky.feed.post/${parsed.rkey}`
    return NextResponse.json({
      uri,
      authorDid: did,
      authorHandle: profile.data.handle,
    })
  } catch (err) {
    return upstreamErrorResponse(err)
  }
}
