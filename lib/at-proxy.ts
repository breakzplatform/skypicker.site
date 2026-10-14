import { NextResponse } from "next/server"

/** Request validation and error mapping shared by the /api/at/* proxies. */

const DID = /^did:[a-z]+:[A-Za-z0-9._:%-]{1,256}$/
const HANDLE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
const RKEY = /^[A-Za-z0-9._~:-]{1,512}$/
const MAX_CURSOR_LENGTH = 1024

export const BSKY_ORIGIN = "https://bsky.app"

function isRecordKey(value: string): boolean {
  return RKEY.test(value) && value !== "." && value !== ".."
}

export function isDid(value: unknown): value is string {
  return typeof value === "string" && DID.test(value)
}

/** at://<did>/app.bsky.feed.post/<rkey>, the only URI the proxies accept. */
export function isPostUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1024) return false
  const m = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/.exec(value)
  return !!m && DID.test(m[1]) && isRecordKey(m[2])
}

/** Pagination cursor; the client sends null for the first page. */
export function isCursor(value: unknown): value is string | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.length <= MAX_CURSOR_LENGTH)
  )
}

/**
 * Splits https://bsky.app/profile/<handle or did>/post/<rkey> into its parts.
 * Anything else, including other hosts and schemes, is rejected.
 */
export function parseBskyPostUrl(
  raw: unknown
): { actor: string; rkey: string } | null {
  if (typeof raw !== "string") return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.origin !== BSKY_ORIGIN || url.username || url.password) return null
  const parts = url.pathname.split("/").filter(Boolean)
  if (parts.length !== 4 || parts[0] !== "profile" || parts[2] !== "post") {
    return null
  }
  const actor = decodeURIComponentSafe(parts[1])
  const rkey = parts[3]
  if (!actor || !(DID.test(actor) || HANDLE.test(actor))) return null
  if (!isRecordKey(rkey)) return null
  return { actor, rkey }
}

function decodeURIComponentSafe(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

type HeaderBag = Record<string, string | undefined>

/**
 * Seconds a client should wait after an upstream 429, from Retry-After or the
 * RateLimit-Reset epoch the Bluesky services send. Clamped to [1, 120].
 */
export function retryAfterSeconds(
  headers: HeaderBag | undefined,
  now = Date.now()
): number {
  const get = (name: string) => {
    for (const [k, v] of Object.entries(headers ?? {})) {
      if (k.toLowerCase() === name) return v
    }
    return undefined
  }
  let seconds = Number(get("retry-after"))
  if (!Number.isFinite(seconds)) {
    const reset = Number(get("ratelimit-reset"))
    seconds = Number.isFinite(reset) ? reset - Math.floor(now / 1000) : 5
  }
  return Math.min(120, Math.max(1, Math.ceil(seconds)))
}

/**
 * Turns an upstream XRPC failure into a response. A 429 stays a 429 with
 * Retry-After so the client backs off and resumes instead of failing the
 * whole draw; 400 and 404 (unknown handle or post) pass through; the rest
 * becomes 502.
 */
export function upstreamErrorResponse(err: unknown): NextResponse {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : NaN
  const headers =
    err && typeof err === "object" && "headers" in err
      ? ((err as { headers?: HeaderBag }).headers ?? undefined)
      : undefined
  const message = err instanceof Error ? err.message : "unknown error"

  if (status === 429) {
    return NextResponse.json(
      { error: "rate limited" },
      {
        status: 429,
        headers: { "retry-after": String(retryAfterSeconds(headers)) },
      }
    )
  }
  if (status === 400 || status === 404) {
    return NextResponse.json({ error: message }, { status })
  }
  return NextResponse.json({ error: message }, { status: 502 })
}
