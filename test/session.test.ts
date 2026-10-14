import { beforeEach, describe, expect, it, vi } from "vitest"

import { sessionOptions } from "@/lib/oauth/session"
import * as logoutRoute from "@/app/api/oauth/logout/route"

vi.mock("next/headers", () => ({ cookies: async () => new Map() }))

describe("session cookie", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-0123456789abcdef")
  })

  it("is host-only, httpOnly, lax and secure on https", () => {
    const opts = sessionOptions("https://www.sorteio.blue")
    expect(opts.cookieName).toBe("skypicker_oauth_www_sorteio_blue")
    expect(opts.cookieOptions).toEqual({
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
    expect(opts.cookieOptions).not.toHaveProperty("domain")
  })

  it("is not marked secure on http loopback", () => {
    expect(sessionOptions("http://127.0.0.1:3000").cookieOptions?.secure).toBe(
      false
    )
  })

  it("requires a long SESSION_SECRET", () => {
    vi.stubEnv("SESSION_SECRET", "short")
    expect(() => sessionOptions("https://skypicker.site")).toThrow(/32/)
    vi.stubEnv("SESSION_SECRET", undefined)
    expect(() => sessionOptions("https://skypicker.site")).toThrow(/32/)
  })
})

describe("logout route", () => {
  it("only accepts POST, so a cross-site link or image cannot sign out", () => {
    expect(typeof logoutRoute.POST).toBe("function")
    expect("GET" in logoutRoute).toBe(false)
  })
})
