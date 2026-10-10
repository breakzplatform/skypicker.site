import { NextResponse, type NextRequest } from "next/server"

import {
  isKnownDomain,
  KNOWN_DOMAINS,
  knownDomainForHost,
  stagingDomainForHost,
} from "./lib/hosts"
import { getDomain } from "./lib/utils"

const DEFAULT_DEV_DOMAIN = "skypicker.site"

function isLoopback(host: string): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)
}

function pathStartsWithKnownDomain(pathname: string): boolean {
  return KNOWN_DOMAINS.some(
    (d) => pathname === `/${d}` || pathname.startsWith(`/${d}/`)
  )
}

export function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const realHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/r/") ||
    url.pathname === "/client-metadata.json"
  ) {
    return
  }

  if (pathStartsWithKnownDomain(url.pathname)) {
    return
  }

  const hostIsLoopback = isLoopback(realHost)

  if (!hostIsLoopback && !knownDomainForHost(realHost)) {
    return new NextResponse("bad host", { status: 400 })
  }

  const overrideDomain = url.searchParams.get("dev_domain")
  if (overrideDomain && !isKnownDomain(overrideDomain)) {
    return
  }

  let domain: string | null = null
  let subdomain: string | null = null
  const stagingDomain = stagingDomainForHost(realHost)

  if (overrideDomain) {
    domain = overrideDomain
  } else if (stagingDomain) {
    domain = stagingDomain
  } else if (hostIsLoopback) {
    domain = process.env.DEV_DOMAIN ?? DEFAULT_DEV_DOMAIN
  } else {
    try {
      const parsed = getDomain(realHost.split(":")[0])
      domain = parsed.domain ?? null
      subdomain = parsed.subdomain ?? null
    } catch {
      return
    }
  }

  if (!domain) return

  const cleanedSearch = (() => {
    if (!overrideDomain) return url.search
    const sp = new URLSearchParams(url.search)
    sp.delete("dev_domain")
    const s = sp.toString()
    return s ? `?${s}` : ""
  })()

  const suffix = url.pathname === "/" ? "" : url.pathname

  if (subdomain && subdomain !== process.env.LANDING_SUBDOMAIN) {
    return NextResponse.rewrite(
      new URL(`/${domain}/${subdomain}${suffix}${cleanedSearch}`, url)
    )
  }

  return NextResponse.rewrite(
    new URL(`/${domain}${suffix}${cleanedSearch}`, url)
  )
}

export const config = {
  matcher: [
    /*
     * Run middleware on every path except:
     *  - /_next/*  (Next internals)
     *  - /_static/*
     *  - root-level files with a known static extension (favicon.ico, og-*.png, robots.txt, etc.)
     *  - .../opengraph-image
     *
     * NOTE: /api/* and /r/* are NOT excluded here — they pass through the
     * early-return fast path inside middleware() so OAuth/at proxy handlers
     * still execute unmodified.
     */
    "/((?!_next/|_static/|[\\w.-]+\\.(?:ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|css|js|map|txt|xml|pdf)$|[a-zA-Z0-9-_.]+/[a-zA-Z0-9-_]+/opengraph-image).*)",
  ],
}
