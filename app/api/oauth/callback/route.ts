import { NextResponse, type NextRequest } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"
import { returnToFromState } from "@/lib/oauth/return-to"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams)
  let origin: string
  try {
    origin = getOriginFromRequest(request)
  } catch {
    return new NextResponse("bad host", { status: 400 })
  }

  try {
    const client = getOAuthClient(origin)
    const { state } = await client.callback(params)

    const returnTo = returnToFromState(state, origin)
    return NextResponse.redirect(new URL(returnTo, origin))
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    const url = new URL("/", origin)
    url.searchParams.set("oauth_error", message)
    return NextResponse.redirect(url)
  }
}
