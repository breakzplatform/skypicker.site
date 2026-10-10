import { NodeOAuthClient } from "@atproto/oauth-client-node"

import { knownDomainForHost } from "../hosts"
import { getSessionStore, getStateStore } from "./stores"

const cache = new Map<string, NodeOAuthClient>()

function isLocalhostOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin)
}

function canonicalizeLoopback(origin: string): string {
  return origin.replace(/^http:\/\/localhost/i, "http://127.0.0.1")
}

type RedirectUri = `https://${string}` | `http://127.0.0.1${string}`

function assertRedirectUri(uri: string): RedirectUri {
  if (uri.startsWith("https://") || uri.startsWith("http://127.0.0.1")) {
    return uri as RedirectUri
  }
  throw new Error(`invalid redirect_uri: ${uri}`)
}

export function getOAuthClient(origin: string): NodeOAuthClient {
  const cleanOrigin = canonicalizeLoopback(origin.replace(/\/$/, ""))
  const cached = cache.get(cleanOrigin)
  if (cached) return cached

  const callbackUrl = assertRedirectUri(`${cleanOrigin}/api/oauth/callback`)
  const isLoopback = isLocalhostOrigin(cleanOrigin)
  const scope = "atproto transition:generic"

  const clientId = isLoopback
    ? `http://localhost?redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}`
    : `${cleanOrigin}/client-metadata.json`

  const client = new NodeOAuthClient({
    clientMetadata: {
      client_id: clientId,
      client_name:
        knownDomainForHost(new URL(cleanOrigin).host) === "sorteio.blue"
          ? "sorteio.blue"
          : "SkyPicker",
      client_uri: cleanOrigin,
      logo_uri: `${cleanOrigin}/favicon.ico`,
      redirect_uris: [callbackUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope,
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
    stateStore: getStateStore(cleanOrigin),
    sessionStore: getSessionStore(cleanOrigin),
  })

  cache.set(cleanOrigin, client)
  return client
}
