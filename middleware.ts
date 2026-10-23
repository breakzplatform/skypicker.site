import { NextResponse, type NextRequest } from "next/server"

import {
  DEFAULT_DOMAIN,
  isAllowedHost,
  isKnownDomain,
  isLoopbackHost,
  KNOWN_DOMAINS,
  knownDomainForHost,
  SITE_DOMAIN_HEADER,
  SITE_PATH_HEADER,
  SITE_QUERY_HEADER,
  stagingDomainForHost,
  type KnownDomain,
} from "./lib/hosts"
import { getDomain } from "./lib/utils"

function knownDomainInPath(pathname: string): KnownDomain | undefined {
  return KNOWN_DOMAINS.find(
    (d) => pathname === `/${d}` || pathname.startsWith(`/${d}/`)
  )
}

/** Forwards the rendered domain so the root layout can set <html lang>. */
function withSiteDomain(request: NextRequest, domain: string): Headers {
  const headers = new Headers(request.headers)
  headers.set(SITE_DOMAIN_HEADER, domain)
  headers.set(SITE_PATH_HEADER, request.nextUrl.pathname)
  headers.set(SITE_QUERY_HEADER, request.nextUrl.search)
  return headers
}

export function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const realHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host

  // Every route, API and snapshot pages included, builds absolute URLs and
  // OAuth metadata from the Host header, so unknown hosts stop here.
  if (!isAllowedHost(realHost.toLowerCase())) {
    return new NextResponse("bad host", { status: 400 })
  }

  // The host's redirect rules run after this middleware, which would otherwise
  // rewrite www.<domain> as a subdomain page.
  const apex = realHost.toLowerCase().replace(/^www\./, "")
  if (apex !== realHost.toLowerCase() && isKnownDomain(apex)) {
    return NextResponse.redirect(
      `https://${apex}${url.pathname}${url.search}`,
      301
    )
  }

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/r/") ||
    url.pathname.startsWith("/s/") ||
    url.pathname === "/client-metadata.json"
  ) {
    if (url.pathname.startsWith("/r/")) {
      const override = url.searchParams.get("dev_domain")
      const domain =
        isLoopbackHost(realHost) && override && isKnownDomain(override)
          ? override
          : (knownDomainForHost(realHost) ?? DEFAULT_DOMAIN)
      return NextResponse.next({
        request: { headers: withSiteDomain(request, domain) },
      })
    }
    return
  }

  const pathDomain = knownDomainInPath(url.pathname)
  if (pathDomain) {
    return NextResponse.next({
      request: { headers: withSiteDomain(request, pathDomain) },
    })
  }

  const hostIsLoopback = isLoopbackHost(realHost)

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
    const devDomain = process.env.DEV_DOMAIN ?? ""
    domain = isKnownDomain(devDomain) ? devDomain : DEFAULT_DOMAIN
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

  const forwarded = { headers: withSiteDomain(request, domain) }

  if (
    subdomain &&
    subdomain !== "staging" &&
    subdomain !== process.env.LANDING_SUBDOMAIN
  ) {
    return NextResponse.rewrite(
      new URL(`/${domain}/${subdomain}${suffix}${cleanedSearch}`, url),
      { request: forwarded }
    )
  }

  return NextResponse.rewrite(
    new URL(`/${domain}${suffix}${cleanedSearch}`, url),
    { request: forwarded }
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
