import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node"

import { getOAuthCookie, type StoredState } from "./session"

const STATE_TTL_MS = 10 * 60 * 1000

function cleanExpired(
  states: Record<string, StoredState> | undefined,
  now: number
): Record<string, StoredState> {
  if (!states) return {}
  const out: Record<string, StoredState> = {}
  for (const [k, e] of Object.entries(states)) {
    if (e && typeof e === "object" && "exp" in e && e.exp > now) out[k] = e
  }
  return out
}

export function getStateStore(origin: string): NodeSavedStateStore {
  return {
    async get(key: string): Promise<NodeSavedState | undefined> {
      const cookie = await getOAuthCookie(origin)
      const entry = cookie.states?.[key]
      if (!entry || entry.exp <= Date.now()) return undefined
      return entry.v
    },
    async set(key: string, value: NodeSavedState): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      const now = Date.now()
      const cleaned = cleanExpired(cookie.states, now)
      cleaned[key] = { v: value, exp: now + STATE_TTL_MS }
      cookie.states = cleaned
      await cookie.save()
    },
    async del(key: string): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      if (cookie.states && key in cookie.states) {
        const { [key]: _, ...rest } = cookie.states
        cookie.states = rest
        await cookie.save()
      }
    },
  }
}

export function getSessionStore(origin: string): NodeSavedSessionStore {
  return {
    async get(key: string): Promise<NodeSavedSession | undefined> {
      const cookie = await getOAuthCookie(origin)
      return cookie.sessions?.[key]
    },
    async set(key: string, value: NodeSavedSession): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      cookie.sessions = { ...(cookie.sessions ?? {}), [key]: value }
      cookie.did = key
      await cookie.save()
    },
    async del(key: string): Promise<void> {
      const cookie = await getOAuthCookie(origin)
      if (cookie.sessions && key in cookie.sessions) {
        const { [key]: _, ...rest } = cookie.sessions
        cookie.sessions = rest
      }
      if (cookie.did === key) {
        delete cookie.did
      }
      await cookie.save()
    },
  }
}
