import { type NextRequest, NextResponse } from "next/server"

import { getCurrentAgent } from "@/lib/atproto"

export const dynamic = "force-dynamic"

const MAX_DIDS = 25

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent()
  if (!agent) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 })
  }

  let body: { dids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const dids = Array.isArray(body.dids)
    ? body.dids.filter((d): d is string => typeof d === "string" && d.length > 0)
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
  const DID_RE = /^did:[a-z]+:[A-Za-z0-9._:%-]+$/i
  if (!dids.every((d) => d.length <= 320 && DID_RE.test(d))) {
    return NextResponse.json({ error: "invalid did" }, { status: 400 })
  }

  try {
    const res = await agent.app.bsky.actor.getProfiles({ actors: dids })
    return NextResponse.json({ profiles: res.data.profiles })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
