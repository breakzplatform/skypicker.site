import { describe, expect, it } from "vitest"

import { returnToFromState, safeReturnTo } from "@/lib/oauth/return-to"

const ORIGIN = "https://skypicker.site"

describe("safeReturnTo", () => {
  it.each([
    ["/", "/"],
    ["/r/abc.def", "/r/abc.def"],
    ["/?x=1#top", "/?x=1#top"],
    ["/a/../b", "/b"],
  ])("keeps %s", (raw, expected) => {
    expect(safeReturnTo(raw, ORIGIN)).toBe(expected)
  })

  it.each([
    null,
    undefined,
    "",
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "\\\\evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "https:evil.example",
  ])("sends %j home", (raw) => {
    const out = safeReturnTo(raw, ORIGIN)
    expect(new URL(out, ORIGIN).origin).toBe(ORIGIN)
    expect(out.startsWith("//")).toBe(false)
  })
})

describe("returnToFromState", () => {
  it("decodes the login route's state", () => {
    expect(returnToFromState(encodeURIComponent("/r/x?y=1"), ORIGIN)).toBe(
      "/r/x?y=1"
    )
  })

  it.each([
    null,
    "%",
    encodeURIComponent("//evil.example"),
    encodeURIComponent("https://evil.example"),
    "%2F%2Fevil.example",
  ])("rejects %j", (state) => {
    expect(returnToFromState(state, ORIGIN)).toBe("/")
  })
})
