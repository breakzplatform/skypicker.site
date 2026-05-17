import { type NextRequest, NextResponse } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"

export const dynamic = "force-dynamic"

const DEFAULT_PDS = "https://bsky.social"

export async function GET(request: NextRequest) {
  const rawHandle = request.nextUrl.searchParams.get("handle")?.trim()
  const returnTo = request.nextUrl.searchParams.get("return_to") ?? "/"
  const origin = getOriginFromRequest(request)
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
