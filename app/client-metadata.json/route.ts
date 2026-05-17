import { type NextRequest, NextResponse } from "next/server"

import { getOAuthClient } from "@/lib/oauth/client"
import { getOriginFromRequest } from "@/lib/oauth/origin"

export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  const origin = getOriginFromRequest(request)
  const client = getOAuthClient(origin)
  return NextResponse.json(client.clientMetadata)
}
