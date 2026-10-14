/**
 * A same-origin path to send the user back to after sign-in, or "/". Rejects
 * absolute URLs, protocol-relative ("//host") and backslash ("/\host") forms,
 * and anything that resolves to another origin.
 */
export function safeReturnTo(
  raw: string | null | undefined,
  origin: string
): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/"
  try {
    const base = new URL(origin)
    const target = new URL(raw, base)
    if (target.origin !== base.origin) return "/"
    return target.pathname + target.search + target.hash
  } catch {
    return "/"
  }
}

/** Decodes the OAuth `state` the login route set, then applies safeReturnTo. */
export function returnToFromState(
  state: string | null | undefined,
  origin: string
): string {
  if (!state) return "/"
  try {
    return safeReturnTo(decodeURIComponent(state), origin)
  } catch {
    return "/"
  }
}
