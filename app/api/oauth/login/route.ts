import { type NextRequest, NextResponse } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"

export const dynamic = "force-dynamic"

const DEFAULT_PDS = "https://bsky.social"

function safeReturnTo(raw: string | null, origin: string): string {
  if (!raw) return "/"
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/"
  try {
    const target = new URL(raw, origin)
    if (target.origin !== new URL(origin).origin) return "/"
    return target.pathname + target.search + target.hash
  } catch {
    return "/"
  }
}

export async function GET(request: NextRequest) {
  const rawHandle = request.nextUrl.searchParams.get("handle")?.trim()
  const origin = getOriginFromRequest(request)
  const returnTo = safeReturnTo(
    request.nextUrl.searchParams.get("return_to"),
    origin
  )
  const input = rawHandle || DEFAULT_PDS

  try {
    const client = getOAuthClient(origin)
    const url = await client.authorize(input, {
      scope: "atproto transition:generic",
      state: encodeURIComponent(returnTo),
    })
    return NextResponse.redirect(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    const url = new URL("/", origin)
    url.searchParams.set("oauth_error", message)
    return NextResponse.redirect(url)
  }
}
