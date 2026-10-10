import { cookies } from "next/headers"
import { getIronSession, type SessionOptions } from "iron-session"
import type {
  NodeSavedSession,
  NodeSavedState,
} from "@atproto/oauth-client-node"

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

function isLoopbackHostname(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(hostname)
}

function cookieName(origin: string): string {
  const host = new URL(origin).hostname.toLowerCase()
  return `skypicker_oauth_${host.replace(/[^a-z0-9]+/g, "_")}`
}

function options(origin: string): SessionOptions {
  const hostname = new URL(origin).hostname
  const isProd = process.env.NODE_ENV === "production"
  const loopback = isLoopbackHostname(hostname)
  return {
    cookieName: cookieName(origin),
    password: sessionPassword(),
    cookieOptions: {
      secure: isProd,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      ...(isProd && !loopback ? { domain: hostname } : {}),
    },
  }
}

export async function getOAuthCookie(origin: string) {
  const store = await cookies()
  return getIronSession<OAuthCookie>(store, options(origin))
}
