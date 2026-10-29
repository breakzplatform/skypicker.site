import { headers } from "next/headers"

import {
  otherLanguageUrl,
  SITE_PATH_HEADER,
  SITE_QUERY_HEADER,
} from "@/lib/hosts"
import { getOriginFromHeaders } from "@/lib/oauth/origin"
import type { SiteContent } from "@/lib/site"
import { ThemeSwitch } from "@/components/theme-switch"

const SUPPORT_LINKS = [
  { label: "Pix", href: "https://pix.joseli.to", ink: "pix" },
  {
    label: "Mercado Pago",
    href: "https://link.mercadopago.com.br/breakzplatform",
    ink: "mercadopago",
  },
  {
    label: "Buy Me a Coffee",
    href: "https://buymeacoffee.com/joselito",
    ink: "coffee",
  },
  {
    label: "GitHub Sponsors",
    href: "https://github.com/sponsors/breakzplatform",
    ink: "sponsors",
  },
]

export async function TopBar({ content }: { content: SiteContent }) {
  const requestHeaders = await headers()
  const href = otherLanguageUrl(
    await getOriginFromHeaders(),
    requestHeaders.get(SITE_PATH_HEADER) ?? "/",
    requestHeaders.get(SITE_QUERY_HEADER) ?? "",
    content.meta.lang === "en" ? "skypicker.site" : "sorteio.blue"
  )
  const other = content.meta.lang === "en" ? "pt-BR" : "en"
  return (
    <div className="sp-topbar">
      {href && (
        <a href={href} lang={other} className="db-btn db-btn-sm cast press">
          {other === "en" ? "english" : "português"}
        </a>
      )}
      <ThemeSwitch strings={content.theme} />
    </div>
  )
}

export function SiteFooter({ content }: { content: SiteContent }) {
  const { footer } = content
  return (
    <footer className="pt-6">
      <p className="db-meta mb-6 text-center">
        {footer.tagline} ·{" "}
        <a href={footer.bugFormUrl} target="_blank" rel="noopener">
          {footer.foundBug}
        </a>{" "}
        · {footer.partOf} <a href="https://notx.blue">notx.blue</a>{" "}
        {footer.byAuthor}{" "}
        <a href="https://bsky.app/profile/joseli.to">@joseli.to</a> ·{" "}
        <a href="https://github.com/breakzplatform/skypicker.site">
          {footer.viewSource}
        </a>
      </p>
      <p className="db-note mb-6 text-center">{footer.fromBrazil}</p>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <span className="db-micro text-text-3 mr-1">{footer.support}</span>
        {SUPPORT_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener"
            className={`db-chip db-chip-${link.ink} cast press`}
          >
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  )
}
