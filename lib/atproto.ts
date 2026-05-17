import { Agent } from "@atproto/api"

import { getOAuthClient } from "./oauth/client"
import { getOriginFromHeaders } from "./oauth/origin"
import { getOAuthCookie } from "./oauth/session"

export async function getCurrentAgent(): Promise<Agent | null> {
  const cookie = await getOAuthCookie()
  if (!cookie.did) return null

  try {
    const origin = await getOriginFromHeaders()
    const client = getOAuthClient(origin)
    const oauthSession = await client.restore(cookie.did)
    return new Agent(oauthSession)
  } catch {
    cookie.destroy()
    return null
  }
}

export async function getCurrentDid(): Promise<string | null> {
  const cookie = await getOAuthCookie()
  return cookie.did ?? null
}
