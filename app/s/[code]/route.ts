import { NextResponse, type NextRequest } from "next/server"

import { getOriginFromRequest } from "@/lib/oauth/origin"
import { resolveShortCode } from "@/lib/short-link"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const origin = getOriginFromRequest(request)
  const path = await resolveShortCode(code, origin)
  if (!path) return new NextResponse("short link not found", { status: 404 })
  return NextResponse.redirect(new URL(path, origin), 302)
}
