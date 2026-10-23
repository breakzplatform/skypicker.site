import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { siteContent } from "@/lib/site"
import { SiteFooter } from "@/components/site-shell"
import { Wordmark } from "@/components/wordmark"
import IndexPage from "@/app/[domain]/page"

const session = vi.hoisted(() => ({ did: null as string | null }))
const request = vi.hoisted(() => ({ headers: new Headers() }))
vi.mock("next/headers", () => ({ headers: async () => request.headers }))
vi.mock("next/navigation", () => ({ usePathname: () => "/" }))
vi.mock("@/components/site-shell", async (importActual) => ({
  ...(await importActual<typeof import("@/components/site-shell")>()),
  TopBar: () => null,
}))
vi.mock("@/lib/atproto", () => ({
  getCurrentDid: async () => session.did,
  getCurrentAgent: async () => null,
}))

const INK = 'class="ink-block tilt-cw"'

describe("per-domain wordmark", () => {
  it("puts the ink block on skypicker, not on .site", () => {
    const html = renderToStaticMarkup(
      createElement(Wordmark, { content: siteContent("skypicker.site") })
    )
    expect(html).toContain(`<span ${INK}>skypicker</span>.site`)
  })
  it("keeps the ink block on .blue for sorteio.blue", () => {
    const html = renderToStaticMarkup(
      createElement(Wordmark, { content: siteContent("sorteio.blue") })
    )
    expect(html).toContain(`sorteio<span ${INK}>.blue</span>`)
  })
  it.each(["skypicker.site", "sorteio.blue"] as const)(
    "titles %s with its own domain name",
    (domain) => {
      expect(siteContent(domain).meta.title.startsWith(`${domain} ·`)).toBe(
        true
      )
    }
  )
})

describe("footer", () => {
  it("follows the down.blue structure in English", () => {
    const html = renderToStaticMarkup(
      createElement(SiteFooter, { content: siteContent("skypicker.site") })
    )
    expect(html).toContain("Work in Progress. Expect bugs")
    expect(html).toContain('href="https://q.joseli.to/forms/notx-blue-bugs"')
    expect(html).toContain("View-source")
    expect(html).toContain("Support this project:")
    expect(html).toContain("signed OAuth session cookie")
  })
})

describe.each(["skypicker.site", "sorteio.blue"] as const)(
  "%s home FAQ",
  (domain) => {
    beforeEach(() => {
      request.headers = new Headers({ host: domain })
    })
    const render = async () =>
      renderToStaticMarkup(
        await IndexPage({
          params: Promise.resolve({ domain }),
          searchParams: Promise.resolve({}),
        })
      )
    it("shows the FAQ to signed-out visitors", async () => {
      session.did = null
      expect(await render()).toContain('aria-labelledby="faq-title"')
    })
    it("hides the FAQ once signed in", async () => {
      session.did = "did:plc:example"
      expect(await render()).not.toContain("faq-title")
    })
  }
)
