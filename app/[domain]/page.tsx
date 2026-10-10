import { Raffle, type RaffleStrings } from "./raffle"

import { getCurrentAgent, getCurrentDid } from "@/lib/atproto"
import { getOriginFromHeaders } from "@/lib/oauth/origin"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/brand-mark"

import content from "../../data/content.json"

type DomainContent = (typeof content)[keyof typeof content]

const SUPPORT_LINKS = [
  {
    label: "Pix",
    href: "https://pix.joseli.to",
    className: "bg-pix text-pix-foreground",
  },
  {
    label: "Buy Me a Coffee",
    href: "https://buymeacoffee.com/joselito",
    className: "bg-coffee text-coffee-foreground",
  },
  {
    label: "GitHub Sponsors",
    href: "https://github.com/sponsors/breakzplatform",
    className: "bg-sponsors text-sponsors-foreground",
  },
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  const c = content[domain as keyof typeof content] as
    | DomainContent
    | undefined

  return {
    title: c?.meta?.title,
    description: c?.meta?.description,
    metadataBase: new URL(await getOriginFromHeaders()),
    openGraph: {
      images: `/og-${domain}.png`,
    },
  }
}

function buildStrings(c: DomainContent): RaffleStrings {
  const r = c.raffle
  const isPt = c.meta.lang === "pt-br"
  return {
    postUrlPlaceholder: r.postUrlPlaceholder,
    modeLabel: r.modeLabel,
    countLabel: r.countLabel,
    submit: r.submit,
    cancel: r.cancel,
    modes: r.modes,
    progress: r.progress,
    loginCta: r.loginCta,
    loginPlaceholder: r.loginPlaceholder,
    loginButton: r.loginButton,
    customHandle: r.customHandle,
    signedInAs: r.signedInAs,
    signOut: r.signOut,
    winner: isPt ? "ganhador" : "winner",
    winners: isPt ? "ganhadores" : "winners",
    poolLabel: "Pool",
    likesLabel: "likes",
    repostsLabel: "reposts",
    titlePlaceholder: isPt
      ? "Título do sorteio (opcional)"
      : "Raffle title (optional)",
    createSnapshot: isPt ? "Gerar link compartilhável" : "Create shareable link",
    creatingSnapshot: isPt ? "Gerando..." : "Creating...",
    openSnapshot: isPt ? "Abrir snapshot" : "Open snapshot",
    copyLink: isPt ? "Copiar link" : "Copy link",
    copied: isPt ? "Copiado" : "Copied",
    downloadOg: isPt ? "Baixar imagem (OG)" : "Download image (OG)",
    snapshotHint: isPt
      ? "Link assinado e imutável. Anyone can verify."
      : "Signed, immutable link. Anyone can verify.",
  }
}

export default async function IndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ oauth_error?: string }>
}) {
  const { domain } = await params
  const sp = await searchParams
  const c = content[domain as keyof typeof content] as
    | DomainContent
    | undefined
  if (!c) return null

  const sessionDid = await getCurrentDid()
  let sessionHandle: string | null = null
  if (sessionDid) {
    try {
      const agent = await getCurrentAgent()
      if (agent) {
        const profile = await agent.app.bsky.actor.getProfile({
          actor: sessionDid,
        })
        sessionHandle = profile.data.handle
      }
    } catch {}
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10">
        <h1 className="flex items-center gap-3 text-4xl font-bold leading-none tracking-tight sm:gap-4 sm:text-6xl">
          <BrandMark className="h-9 w-9 sm:h-14 sm:w-14" />
          {c.title}
        </h1>
        <p className="mt-5 text-lg sm:mt-7 sm:text-xl">{c.subtitle}</p>
        <p
          className="mt-3 text-sm text-gray-700 dark:text-[#FEF3E2]/80"
          dangerouslySetInnerHTML={{ __html: c.description }}
        />
      </header>

      <Raffle
        sessionDid={sessionDid}
        sessionHandle={sessionHandle}
        strings={buildStrings(c)}
        initialError={sp.oauth_error}
      />

      <footer className="mt-16 text-xs text-muted-foreground">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-1">{c.footer.support}</span>
          {SUPPORT_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener"
              className={cn(
                "rounded-full px-3 py-1.5 font-bold shadow transition hover:brightness-95 dark:hover:brightness-110",
                link.className
              )}
            >
              {link.label}
            </a>
          ))}
        </div>
        <p
          className="mb-1"
          dangerouslySetInnerHTML={{ __html: c.footer.by }}
        />
        <p>{c.footer.noCookies}</p>
        <p>
          <a
            href="https://github.com/breakzplatform"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            {c.footer.ghFork}
          </a>
        </p>
      </footer>
    </div>
  )
}
