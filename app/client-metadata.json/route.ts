import { NextResponse, type NextRequest } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"

export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  let origin: string
  try {
    origin = getOriginFromRequest(request)
  } catch {
    return new NextResponse("bad host", { status: 400 })
  }
  const client = getOAuthClient(origin)
  return NextResponse.json(client.clientMetadata)
}
