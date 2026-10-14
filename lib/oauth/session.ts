import { cookies } from "next/headers"
import type {
  NodeSavedSession,
  NodeSavedState,
} from "@atproto/oauth-client-node"
import { getIronSession, type SessionOptions } from "iron-session"

export type StoredState = { v: NodeSavedState; exp: number }

export type OAuthCookie = {
  did?: string
  states?: Record<string, StoredState>
  sessions?: Record<string, NodeSavedSession>
}

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters"
    )
  }
  return secret
}

function cookieName(origin: string): string {
  const host = new URL(origin).hostname.toLowerCase()
  return `skypicker_oauth_${host.replace(/[^a-z0-9]+/g, "_")}`
}

export function sessionOptions(origin: string): SessionOptions {
  return {
    cookieName: cookieName(origin),
    password: sessionPassword(),
    // Host-only (no Domain attribute), so sibling subdomains never see it.
    cookieOptions: {
      secure: new URL(origin).protocol === "https:",
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  }
}

export async function getOAuthCookie(origin: string) {
  const store = await cookies()
  return getIronSession<OAuthCookie>(store, sessionOptions(origin))
}
