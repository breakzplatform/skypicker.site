import { headers } from "next/headers"
import type { NextRequest } from "next/server"

function isLocalHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)
}

export function getOriginFromRequest(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (isLocalHost(host) ? "http" : "https")
  return `${proto}://${host}`
}

export async function getOriginFromHeaders(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) {
    throw new Error("Cannot determine request host")
  }
  const proto =
    h.get("x-forwarded-proto") ?? (isLocalHost(host) ? "http" : "https")
  return `${proto}://${host}`
}
