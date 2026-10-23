const DAGD = "https://da.gd"
const CODE_PATTERN = /^[A-Za-z0-9_]{4,30}$/
const TIMEOUT_MS = 8000

export type ShortLink = { url: string; shortened: boolean }

export function isShortCode(code: string): boolean {
  return CODE_PATTERN.test(code)
}

async function dagd(path: string, fetchImpl: typeof fetch): Promise<string> {
  const res = await fetchImpl(`${DAGD}/${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = (await res.text()).trim()
  if (!res.ok) throw new Error(`da.gd returned ${res.status}: ${text}`)
  return text
}

/**
 * Shortens a result URL with da.gd (the shortener down.blue uses; v.gd and
 * is.gd stopped accepting new links). The short link is `<origin>/s/<code>`,
 * which keeps the site domain and lets `/s/[code]` resolve it server-side.
 * Any failure resolves to the full URL so the caller can still copy it.
 */
export async function shortenResultUrl(
  longUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<ShortLink> {
  try {
    const origin = new URL(longUrl).origin
    const shortUrl = new URL(
      await dagd(`s?url=${encodeURIComponent(longUrl)}`, fetchImpl)
    )
    const code = shortUrl.pathname.match(/^\/([A-Za-z0-9_]{4,30})\/?$/)?.[1]
    if (shortUrl.hostname !== "da.gd" || !code) {
      throw new Error("unexpected da.gd response")
    }
    return { url: `${origin}/s/${code}`, shortened: true }
  } catch {
    return { url: longUrl, shortened: false }
  }
}

/**
 * Resolves a short code to the `/r/...` path it was created for. Only paths
 * on `origin` are accepted, so the endpoint cannot become an open redirect.
 */
export async function resolveShortCode(
  code: string,
  origin: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (!isShortCode(code)) return null
  try {
    const target = new URL(await dagd(`coshorten/${code}`, fetchImpl))
    if (target.origin !== origin || !target.pathname.startsWith("/r/")) {
      return null
    }
    return `${target.pathname}${target.search}`
  } catch {
    return null
  }
}
