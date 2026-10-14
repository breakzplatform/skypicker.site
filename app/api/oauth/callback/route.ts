import { NextResponse, type NextRequest } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"

export const dynamic = "force-dynamic"

function safeReturnTo(raw: string | undefined | null, origin: string): string {
  if (!raw) return "/"
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return "/"
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/"
  try {
    const target = new URL(decoded, origin)
    if (target.origin !== new URL(origin).origin) return "/"
    return target.pathname + target.search + target.hash
  } catch {
    return "/"
  }
}

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

    const returnTo = safeReturnTo(state, origin)
    return NextResponse.redirect(new URL(returnTo, origin))
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    const url = new URL("/", origin)
    url.searchParams.set("oauth_error", message)
    return NextResponse.redirect(url)
  }
}
