// Ported from down.blue; only the actor and record key survive parsing.
export function extractProfileAndPost(postUrl: unknown) {
  const input = String(postUrl ?? "").trim()
  let rawProfile: string
  let rawPost: string
  let host: string | null = null
  const atUri = input.match(
    /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)\/?$/
  )
  if (atUri) {
    ;[, rawProfile, rawPost] = atUri
  } else {
    let url
    try {
      url = new URL(
        /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`
      )
    } catch {
      throw new Error("Invalid URL")
    }
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      throw new Error("Invalid URL")
    }
    const m = url.pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)\/?$/)
    if (!m) throw new Error("Invalid URL format")
    ;[, rawProfile, rawPost] = m
    host = url.hostname.replace(/\.$/, "").replace(/^www\./, "")
  }
  let profile
  let post
  try {
    profile = decodeURIComponent(rawProfile)
    post = decodeURIComponent(rawPost)
  } catch {
    throw new Error("Invalid URL format")
  }
  // Handle or DID, and a record key, per the AT Protocol syntax rules.
  // No "%": a decoded value must rebuild into the same URL, or history drifts.
  // "." and ".." are forbidden record keys and would walk the rebuilt path.
  if (
    !/^[a-zA-Z0-9._:-]{1,253}$/.test(profile) ||
    !/^[a-zA-Z0-9._:~-]{1,512}$/.test(post) ||
    [".", ".."].includes(profile) ||
    [".", ".."].includes(post)
  ) {
    throw new Error("Invalid URL format")
  }
  return {
    profile,
    post,
    url: `https://bsky.app/profile/${profile}/post/${post}`,
    // Came from another Atmosphere client or an at:// URI.
    fromAtmosphere: host !== "bsky.app",
  }
}
