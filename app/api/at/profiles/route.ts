import { NextResponse, type NextRequest } from "next/server"

import { isDid, upstreamErrorResponse } from "@/lib/at-proxy"
import { getCurrentAgent } from "@/lib/atproto"

export const dynamic = "force-dynamic"

const MAX_DIDS = 25

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent()
  if (!agent) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 })
  }

  let body: { dids?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const raw = body?.dids
  const dids = Array.isArray(raw)
    ? raw.filter((d): d is string => typeof d === "string" && d.length > 0)
    : []
  if (dids.length === 0) {
    return NextResponse.json({ profiles: [] })
  }
  if (dids.length > MAX_DIDS) {
    return NextResponse.json(
      { error: `max ${MAX_DIDS} dids per request` },
      { status: 400 }
    )
  }
  if (!dids.every(isDid)) {
    return NextResponse.json({ error: "invalid did" }, { status: 400 })
  }

  try {
    const res = await agent.app.bsky.actor.getProfiles({ actors: dids })
    return NextResponse.json({ profiles: res.data.profiles })
  } catch (err) {
    return upstreamErrorResponse(err)
  }
}
