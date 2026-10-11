import type { SiteContent } from "@/lib/site"
import { ThemeSwitch } from "@/components/theme-switch"

const SUPPORT_LINKS = [
  { label: "Pix", href: "https://pix.joseli.to", ink: "ink-pix" },
  {
    label: "Buy Me a Coffee",
    href: "https://buymeacoffee.com/joselito",
    ink: "ink-yellow",
  },
  {
    label: "GitHub Sponsors",
    href: "https://github.com/sponsors/breakzplatform",
    ink: "ink-sponsors",
  },
]

export function TopBar({ content }: { content: SiteContent }) {
  return (
    <div className="sp-topbar">
      <ThemeSwitch strings={content.theme} />
    </div>
  )
}

export function SiteFooter({ content }: { content: SiteContent }) {
  return (
    <footer className="sp-foot">
      <div className="sp-chips">
        <span className="label m-0">{content.footer.support}</span>
        {SUPPORT_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener"
            className={`sp-chip cast press ${link.ink}`}
          >
            {link.label}
          </a>
        ))}
      </div>
      <p
        className="sp-note"
        dangerouslySetInnerHTML={{ __html: content.footer.by }}
      />
      <p className="sp-note">{content.footer.noCookies}</p>
      <p className="sp-note">
        <a
          href="https://github.com/breakzplatform/skypicker.site"
          target="_blank"
          rel="noopener"
        >
          {content.footer.ghFork}
        </a>
      </p>
    </footer>
  )
}
