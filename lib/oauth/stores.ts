import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node"

import { getOAuthCookie } from "./session"

export const stateStore: NodeSavedStateStore = {
  async get(key: string): Promise<NodeSavedState | undefined> {
    const cookie = await getOAuthCookie()
    return cookie.states?.[key]
  },
  async set(key: string, value: NodeSavedState): Promise<void> {
    const cookie = await getOAuthCookie()
    cookie.states = { ...(cookie.states ?? {}), [key]: value }
    await cookie.save()
  },
  async del(key: string): Promise<void> {
    const cookie = await getOAuthCookie()
    if (cookie.states && key in cookie.states) {
      const { [key]: _, ...rest } = cookie.states
      cookie.states = rest
      await cookie.save()
    }
  },
}

export const sessionStore: NodeSavedSessionStore = {
  async get(key: string): Promise<NodeSavedSession | undefined> {
    const cookie = await getOAuthCookie()
    return cookie.sessions?.[key]
  },
  async set(key: string, value: NodeSavedSession): Promise<void> {
    const cookie = await getOAuthCookie()
    cookie.sessions = { ...(cookie.sessions ?? {}), [key]: value }
    cookie.did = key
    await cookie.save()
  },
  async del(key: string): Promise<void> {
    const cookie = await getOAuthCookie()
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
