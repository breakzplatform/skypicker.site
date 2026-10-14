/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getOriginFromHeaders } from "@/lib/oauth/origin"
import { getSiteDomain, siteContent } from "@/lib/site"
import { decodeSnapshot, type Snapshot } from "@/lib/snapshot"
import { SiteFooter, TopBar } from "@/components/site-shell"
import { Wordmark } from "@/components/wordmark"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_APPVIEW = "https://public.api.bsky.app"
const MAX_PROFILE_BATCH = 25

type LiveProfile = {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

async function fetchLiveProfiles(
  dids: string[]
): Promise<Map<string, LiveProfile>> {
  const out = new Map<string, LiveProfile>()
  for (let i = 0; i < dids.length; i += MAX_PROFILE_BATCH) {
    const batch = dids.slice(i, i + MAX_PROFILE_BATCH)
    const url = new URL(`${PUBLIC_APPVIEW}/xrpc/app.bsky.actor.getProfiles`)
    for (const did of batch) url.searchParams.append("actors", did)
    try {
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) continue
      const data = (await res.json()) as { profiles: LiveProfile[] }
      for (const p of data.profiles) out.set(p.did, p)
    } catch {}
  }
  return out
}

function decodeOrNotFound(encoded: string): Snapshot {
  try {
    return decodeSnapshot(encoded)
  } catch {
    notFound()
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ snapshot: string }>
}): Promise<Metadata> {
  const { snapshot: encoded } = await params
  const snapshot = decodeOrNotFound(encoded)
  const c = siteContent(await getSiteDomain())

  const title = snapshot.t ?? c.snapshot.fallbackTitle
  const winners = snapshot.w.length === 1 ? c.raffle.winner : c.raffle.winners
  const description = `${snapshot.w.length} ${winners} · ${c.snapshot.modes[snapshot.m]}`

  return {
    title,
    description,
    metadataBase: new URL(await getOriginFromHeaders()),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: new Date(snapshot.ts).toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function SnapshotPage({
  params,
}: {
  params: Promise<{ snapshot: string }>
}) {
  const { snapshot: encoded } = await params
  const snapshot = decodeOrNotFound(encoded)
  const c = siteContent(await getSiteDomain())
  const locale = c.meta.locale

  const live = await fetchLiveProfiles(snapshot.w.map((w) => w.did))
  const ts = new Date(snapshot.ts)
  const when = ts.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })

  return (
    <div className="sp-page">
      <TopBar content={c} />
      <main>
        <header className="sp-masthead sp-masthead-sm">
          <a href="/" className="wordmark" data-no-invert>
            <Wordmark content={c} as="p" />
          </a>
        </header>

        <section className="panel cast">
          <h1 className="panel-h">{c.snapshot.kicker}</h1>
          <div className="panel-b sp-stack">
            <p className="sp-result-title">
              {snapshot.t ?? c.snapshot.fallbackTitle}
            </p>
            <p className="meta">
              <time dateTime={ts.toISOString()}>{when} UTC</time>
              {" · "}
              {c.snapshot.modes[snapshot.m]}
              {" · "}
              {snapshot.tl[0].toLocaleString(locale)} {c.raffle.likesLabel}
              {" · "}
              {snapshot.tl[1].toLocaleString(locale)} {c.raffle.repostsLabel}
              {snapshot.ph ? ` · ${c.snapshot.postBy} @${snapshot.ph}` : ""}
            </p>
          </div>

          <h2 className="label sp-section-label m-0">
            {snapshot.w.length}{" "}
            {snapshot.w.length === 1 ? c.raffle.winner : c.raffle.winners}
          </h2>
          <ol className="sp-winners sp-section">
            {snapshot.w.map((w, i) => {
              const liveProfile = live.get(w.did)
              const handle = liveProfile?.handle ?? w.h
              const displayName = liveProfile?.displayName || w.n || handle
              return (
                <li key={w.did}>
                  <a
                    href={`https://bsky.app/profile/${handle}`}
                    target="_blank"
                    rel="noopener"
                    className="sp-row"
                  >
                    <span className="sp-rank">{i + 1}</span>
                    {liveProfile?.avatar ? (
                      <img
                        src={liveProfile.avatar}
                        alt=""
                        className="sp-avatar"
                      />
                    ) : (
                      <span className="sp-avatar screen" />
                    )}
                    <span className="sp-who">
                      <span className="sp-name">{displayName}</span>
                      <span className="sp-handle">@{handle}</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>

          <div className="panel-b sp-section sp-stack">
            <span className="label m-0">{c.snapshot.shareTitle}</span>
            <div className="sp-actions">
              <a
                href={`/r/${encoded}/og.png?dl=1`}
                download
                className="btn primary cast press"
              >
                {c.snapshot.downloadOg}
              </a>
              <a
                href={`/r/${encoded}/og.png`}
                target="_blank"
                rel="noopener"
                className="btn cast press"
              >
                {c.snapshot.openOg} ↗
              </a>
            </div>
            <p className="hint m-0">{c.snapshot.shareHint}</p>
          </div>
        </section>

        <p className="sp-back">
          <a href="/">← {c.snapshot.newRaffle}</a>
        </p>
      </main>
      <SiteFooter content={c} />
    </div>
  )
}
