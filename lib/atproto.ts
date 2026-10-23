import { Agent } from "@atproto/api"

import { getOAuthClient } from "./oauth/client"
import { getOriginFromHeaders } from "./oauth/origin"
import { getOAuthCookie } from "./oauth/session"

export async function getCurrentAgent(): Promise<Agent | null> {
  const origin = await getOriginFromHeaders()
  const cookie = await getOAuthCookie(origin)
  if (!cookie.did) return null

  try {
    const client = getOAuthClient(origin)
    const oauthSession = await client.restore(cookie.did)
    return new Agent(oauthSession)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(
      "[atproto] session restore failed for %s: %s — destroying cookie",
      cookie.did,
      message
    )
    cookie.destroy()
    return null
  }
}

export async function getCurrentDid(): Promise<string | null> {
  const origin = await getOriginFromHeaders()
  const cookie = await getOAuthCookie(origin)
  return cookie.did ?? null
}
