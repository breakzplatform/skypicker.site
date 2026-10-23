import { describe, expect, it } from "vitest"

import { otherLanguageUrl } from "@/lib/hosts"

describe("otherLanguageUrl", () => {
  it.each([
    [
      "https://skypicker.site",
      "/r/token",
      "?a=1&a=2",
      "https://sorteio.blue/r/token?a=1&a=2",
    ],
    ["sorteio.blue", "/", "", "https://skypicker.site/"],
    [
      "staging.skypicker.site",
      "/r/token",
      "?dl=1",
      "https://staging.sorteio.blue/r/token?dl=1",
    ],
    ["staging.sorteio.blue", "/", "", "https://staging.skypicker.site/"],
    [
      "http://localhost:3000",
      "/skypicker.site/path",
      "?a=1",
      "http://localhost:3000/sorteio.blue/path?a=1",
    ],
    [
      "http://127.0.0.1:3000",
      "/sorteio.blue/",
      "",
      "http://127.0.0.1:3000/skypicker.site/",
    ],
    [
      "http://localhost:3000",
      "/r/token",
      "?dev_domain=sorteio.blue&a=1",
      "http://localhost:3000/r/token?dev_domain=skypicker.site&a=1",
    ],
  ])("maps %s%s%s", (host, path, query, expected) => {
    expect(otherLanguageUrl(host, path, query)).toBe(expected)
  })
  it.each([
    "evil.example",
    "https://skypicker.site.evil.example",
    "https://user:pass@skypicker.site",
    "javascript:alert(1)",
  ])("rejects %s", (host) => {
    expect(otherLanguageUrl(host, "/", "")).toBeNull()
  })
  it("keeps an untrusted path on the destination host", () => {
    expect(
      new URL(
        otherLanguageUrl(
          "skypicker.site",
          "//evil.example/a",
          "?next=https://evil.example"
        )!
      ).host
    ).toBe("sorteio.blue")
  })
})
