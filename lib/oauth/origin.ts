import { headers } from "next/headers"
import type { NextRequest } from "next/server"

import { isAllowedHost, isLoopbackHost } from "../hosts"

/** Thrown when a request's Host is not one this app serves. */
export class UntrustedHostError extends Error {
  constructor(host: string) {
    super(`untrusted host: ${JSON.stringify(host.slice(0, 100))}`)
    this.name = "UntrustedHostError"
  }
}

/**
 * The origin (`proto://host`) for a request, built from its Host and
 * X-Forwarded-Proto headers. Only loopback hosts and hosts that serve a known
 * domain (production domains, their subdomains and STAGING_HOSTS) are
 * accepted, so a forged Host can never become an OAuth client_id, redirect
 * target or cookie scope. Non-loopback origins are always https.
 */
export function resolveOrigin(
  rawHost: string | null | undefined,
  rawProto: string | null | undefined
): string {
  const host = (rawHost ?? "").split(",")[0].trim().toLowerCase()
  const proto = (rawProto ?? "").split(",")[0].trim().toLowerCase()

  if (isLoopbackHost(host)) {
    return `${proto === "https" ? "https" : "http"}://${host}`
  }
  if (!isAllowedHost(host)) {
    throw new UntrustedHostError(host)
  }
  return `https://${host}`
}

export function getOriginFromRequest(request: NextRequest): string {
  return resolveOrigin(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.host,
    request.headers.get("x-forwarded-proto")
  )
}

export async function getOriginFromHeaders(): Promise<string> {
  const h = await headers()
  return resolveOrigin(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto")
  )
}
