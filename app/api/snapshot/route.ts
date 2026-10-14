import { NextResponse, type NextRequest } from "next/server"

import { getCurrentDid } from "@/lib/atproto"
import { buildSnapshot, encodeSnapshot, type FilterMode } from "@/lib/snapshot"

const VALID_MODES: readonly FilterMode[] = ["likes", "reposts", "and", "or"]

function isValidMode(m: unknown): m is FilterMode {
  return typeof m === "string" && (VALID_MODES as readonly string[]).includes(m)
}

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
  // Signed links are only minted for signed-in users. The server still cannot
  // prove the winners were drawn here (the draw runs in the browser); see the
  // open question in the PR.
  if (!(await getCurrentDid())) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (!body?.postUri || !body.mode || !Array.isArray(body.winners)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 })
  }
  if (!isValidMode(body.mode)) {
    return NextResponse.json({ error: "invalid mode" }, { status: 400 })
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
