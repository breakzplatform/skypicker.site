import { cookies } from "next/headers"
import { getIronSession, type SessionOptions } from "iron-session"
import type {
  NodeSavedSession,
  NodeSavedState,
} from "@atproto/oauth-client-node"

export type OAuthCookie = {
  did?: string
  states?: Record<string, NodeSavedState>
  sessions?: Record<string, NodeSavedSession>
}

const SESSION_NAME = "skypicker_oauth"

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters"
    )
  }
  return secret
}

function options(): SessionOptions {
  return {
    cookieName: SESSION_NAME,
    password: sessionPassword(),
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  }
}

export async function getOAuthCookie() {
  const store = await cookies()
  return getIronSession<OAuthCookie>(store, options())
}
