import { type NextRequest, NextResponse } from "next/server"

import { buildSnapshot, encodeSnapshot, type FilterMode } from "@/lib/snapshot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Body = {
  title?: string
  postUri?: string
  postHandle?: string
  mode?: FilterMode
  totalLikes?: number
  totalReposts?: number
  winners?: Array<{ did: string; handle: string; displayName?: string }>
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (!body.postUri || !body.mode || !Array.isArray(body.winners)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 })
  }

  try {
    const snapshot = buildSnapshot({
      title: body.title,
      postUri: body.postUri,
      postHandle: body.postHandle,
      mode: body.mode,
      totalLikes: body.totalLikes ?? 0,
      totalReposts: body.totalReposts ?? 0,
      winners: body.winners.map((w) => ({
        did: w.did,
        h: w.handle,
        ...(w.displayName ? { n: w.displayName } : {}),
      })),
    })
    const encoded = encodeSnapshot(snapshot)
    return NextResponse.json({ id: encoded, path: `/r/${encoded}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
