import { type NextRequest, NextResponse } from "next/server"

import { getCurrentAgent } from "@/lib/atproto"

export const dynamic = "force-dynamic"

const POST_URL_PREFIX = "https://bsky.app/profile/"

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

  const url = body.url?.trim()
  if (!url || !url.startsWith(POST_URL_PREFIX)) {
    return NextResponse.json({ error: "invalid post url" }, { status: 400 })
  }

  const path = url.slice(POST_URL_PREFIX.length).split("?")[0]
  const [handle, kind, postId] = path.split("/")
  if (!handle || kind !== "post" || !postId) {
    return NextResponse.json({ error: "invalid post url" }, { status: 400 })
  }

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
