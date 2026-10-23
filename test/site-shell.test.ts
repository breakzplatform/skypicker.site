import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { siteContent } from "@/lib/site"
import { Faq } from "@/components/faq"
import { TopBar } from "@/components/site-shell"
import { Raffle } from "@/app/[domain]/raffle"

const request = vi.hoisted(() => ({ headers: new Headers() }))
vi.mock("next/headers", () => ({ headers: async () => request.headers }))
vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

describe.each(["skypicker.site", "sorteio.blue"] as const)(
  "%s server HTML",
  (domain) => {
    const content = siteContent(domain)
    it("contains the complete language link before hydration", async () => {
      request.headers = new Headers({
        host: `staging.${domain}`,
        "x-site-path": "/r/token",
        "x-site-query": "?a=1&a=2",
      })
      const html = renderToStaticMarkup(await TopBar({ content }))
      const other =
        domain === "skypicker.site" ? "sorteio.blue" : "skypicker.site"
      expect(html).toContain(
        `href="https://staging.${other}/r/token?a=1&amp;a=2"`
      )
    })
    it("renders a collapsed, native FAQ", () => {
      const html = renderToStaticMarkup(
        createElement(Faq, { content: content.faq })
      )
      expect(html.match(/<details/g)).toHaveLength(6)
      expect(html).not.toContain(" open")
      expect(html).toContain('aria-labelledby="faq-title"')
    })
    it.each([
      null,
      {
        handle: "example.test",
        displayName: "Example Person",
        avatar: "https://example.test/avatar.png",
      },
    ])(
      "renders the signed-in profile with a POST logout and fallback",
      (sessionProfile) => {
        const html = renderToStaticMarkup(
          createElement(Raffle, {
            sessionDid: "did:plc:example",
            sessionProfile,
            strings: {
              ...content.raffle,
              signin: content.signin,
              intro: content.intro,
            },
            locale: content.meta.locale,
          })
        )
        expect(html).toContain('action="/api/oauth/logout"')
        expect(html).toContain('method="POST"')
        expect(html).toContain(
          sessionProfile ? "Example Person" : "did:plc:example"
        )
        expect(html).toContain(
          sessionProfile ? 'class="sp-avatar-image"' : "sp-avatar avatar screen"
        )
        expect(html).toContain(content.intro.lead)
        expect(html).not.toContain('type="url"')
      }
    )
  }
)
