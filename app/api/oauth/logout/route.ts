import { NextResponse, type NextRequest } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"
import { getOAuthCookie } from "@/lib/oauth/session"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  let origin: string
  try {
    origin = getOriginFromRequest(request)
  } catch {
    return new NextResponse("bad host", { status: 400 })
  }
  const cookie = await getOAuthCookie(origin)
  const did = cookie.did

  if (did) {
    try {
      const client = getOAuthClient(origin)
      await client.revoke(did)
    } catch {}
  }

  cookie.destroy()
  return NextResponse.redirect(new URL("/", origin), { status: 303 })
}

export const GET = POST
