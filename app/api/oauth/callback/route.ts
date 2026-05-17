import { type NextRequest, NextResponse } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams)
  const origin = getOriginFromRequest(request)

  try {
    const client = getOAuthClient(origin)
    const { state } = await client.callback(params)

    let returnTo = "/"
    if (state) {
      try {
        returnTo = decodeURIComponent(state) || "/"
      } catch {
        returnTo = "/"
      }
    }

    return NextResponse.redirect(new URL(returnTo, origin))
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    const url = new URL("/", origin)
    url.searchParams.set("oauth_error", message)
    return NextResponse.redirect(url)
  }
}
