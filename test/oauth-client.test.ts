import { beforeEach, describe, expect, it, vi } from "vitest"

import { getOAuthClient, oauthClientName } from "@/lib/oauth/client"

// The stores only touch cookies when the client reads or writes state.
vi.mock("next/headers", () => ({ cookies: async () => new Map() }))

describe("OAuth client metadata", () => {
  beforeEach(() => {
    vi.stubEnv("STAGING_HOSTS", "sb-staging.example.app=sorteio.blue")
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it.each([
    ["https://skypicker.site", "SkyPicker"],
    ["https://www.skypicker.site", "SkyPicker"],
    ["https://sorteio.blue", "sorteio.blue"],
    ["https://sb-staging.example.app", "sorteio.blue"],
    ["http://127.0.0.1:3000", "SkyPicker"],
  ])("names %s %s", (origin, name) => {
    expect(oauthClientName(origin)).toBe(name)
  })

  it("is named after the serving domain", () => {
    const meta = getOAuthClient("https://sorteio.blue").clientMetadata
    expect(meta).toMatchObject({
      client_id: "https://sorteio.blue/client-metadata.json",
      client_name: "sorteio.blue",
      client_uri: "https://sorteio.blue",
      redirect_uris: ["https://sorteio.blue/api/oauth/callback"],
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    })
  })

  it("uses a loopback client id on localhost", () => {
    const meta = getOAuthClient("http://localhost:3000").clientMetadata
    expect(meta.client_id).toMatch(/^http:\/\/localhost\?redirect_uri=/)
    expect(meta.redirect_uris).toEqual([
      "http://127.0.0.1:3000/api/oauth/callback",
    ])
  })

  it("refuses non-https, non-loopback redirect URIs", () => {
    expect(() => getOAuthClient("http://skypicker.site")).toThrow(
      /redirect_uri/
    )
  })
})
