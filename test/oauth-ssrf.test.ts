import { describe, expect, it, vi } from "vitest"

import { oauthFetch } from "@/lib/oauth/client"

vi.mock("next/headers", () => ({ cookies: async () => new Map() }))

describe("oauthFetch (SSRF guard for sign-in lookups)", () => {
  it.each([
    "http://example.com/.well-known/oauth-protected-resource",
    "https://127.0.0.1/.well-known/oauth-protected-resource",
    "https://169.254.169.254/latest/meta-data/",
    "https://10.0.0.1/",
    "https://[::1]/",
    "https://example.com:8443/",
    "file:///etc/passwd",
    // Resolves through DNS (hosts file) to a loopback address.
    "https://localhost/.well-known/atproto-did",
  ])("refuses %s", async (url) => {
    await expect(oauthFetch(url)).rejects.toThrow(
      /protocol|unicast|port|public domain|fetch failed/
    )
  })
})
