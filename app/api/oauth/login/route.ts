import { NextResponse, type NextRequest } from "next/server"

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

const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i

/**
 * What to hand the OAuth client, in order. A handle or DID resolves to its PDS;
 * an https URL is used as the PDS/entryway directly. A bare hostname is tried
 * as a handle first and then as a server address, so "pds.example.com" works
 * as well as "https://pds.example.com".
 */
function loginCandidates(raw: string | undefined): string[] {
  const input = raw?.trim().replace(/^@/, "")
  if (!input) return [DEFAULT_PDS]
  if (/^https?:\/\//i.test(input) || input.startsWith("did:")) return [input]
  const candidates = [input.toLowerCase()]
  if (HOSTNAME.test(input)) candidates.push(`https://${input.toLowerCase()}`)
  return candidates
}

export async function GET(request: NextRequest) {
  let origin: string
  try {
    origin = getOriginFromRequest(request)
  } catch {
    return new NextResponse("bad host", { status: 400 })
  }
  const returnTo = safeReturnTo(
    request.nextUrl.searchParams.get("return_to"),
    origin
  )
  const candidates = loginCandidates(
    request.nextUrl.searchParams.get("handle") ?? undefined
  )
  const client = getOAuthClient(origin)

  let failure: unknown
  for (const input of candidates) {
    try {
      const url = await client.authorize(input, {
        scope: "atproto transition:generic",
        state: encodeURIComponent(returnTo),
      })
      return NextResponse.redirect(url)
    } catch (err) {
      failure ??= err
    }
  }

  const message = failure instanceof Error ? failure.message : "unknown error"
  const url = new URL("/", origin)
  url.searchParams.set("oauth_error", message)
  return NextResponse.redirect(url)
}
