/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { decodeSnapshot, type Snapshot } from "@/lib/snapshot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_APPVIEW = "https://public.api.bsky.app"
const MAX_PROFILE_BATCH = 25

const MODE_LABELS: Record<Snapshot["m"], string> = {
  likes: "Likes only",
  reposts: "Reposts only",
  and: "Likes ∩ Reposts",
  or: "Likes ∪ Reposts",
}

type LiveProfile = {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

async function fetchLiveProfiles(dids: string[]): Promise<Map<string, LiveProfile>> {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ snapshot: string }>
}): Promise<Metadata> {
  const { snapshot: encoded } = await params
  let snapshot: Snapshot
  try {
    snapshot = decodeSnapshot(encoded)
  } catch {
    notFound()
  }

  const title = snapshot.t ?? "Bluesky Raffle"
  const description = `${snapshot.w.length} ${snapshot.w.length === 1 ? "winner" : "winners"} · ${MODE_LABELS[snapshot.m]}`

  return {
    title,
    description,
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

  let snapshot: Snapshot
  try {
    snapshot = decodeSnapshot(encoded)
  } catch {
    notFound()
  }

  const live = await fetchLiveProfiles(snapshot.w.map((w) => w.did))
  const ts = new Date(snapshot.ts)

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          🎯 SkyPicker · Raffle snapshot
        </p>
        <h1 className="text-3xl font-bold sm:text-5xl">
          {snapshot.t ?? "Bluesky Raffle"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          <time dateTime={ts.toISOString()}>{ts.toUTCString()}</time>
          {" · "}
          {MODE_LABELS[snapshot.m]}
          {" · "}
          {snapshot.tl[0].toLocaleString()} likes ·{" "}
          {snapshot.tl[1].toLocaleString()} reposts
          {snapshot.ph ? ` · post by @${snapshot.ph}` : ""}
        </p>
      </header>

      <section className="mb-8 grid gap-3">
        <h2 className="text-lg font-semibold">
          {snapshot.w.length}{" "}
          {snapshot.w.length === 1 ? "winner" : "winners"}
        </h2>
        <ol className="grid gap-3">
          {snapshot.w.map((w, i) => {
            const liveProfile = live.get(w.did)
            const handle = liveProfile?.handle ?? w.h
            const displayName = liveProfile?.displayName ?? w.n ?? w.h
            return (
              <li
                key={w.did}
                className="flex items-center gap-4 rounded-md border border-border/40 p-3"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold dark:bg-slate-800">
                  {i + 1}
                </span>
                {liveProfile?.avatar ? (
                  <img
                    src={liveProfile.avatar}
                    alt={`${handle} avatar`}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                )}
                <div className="flex flex-1 flex-col">
                  <a
                    href={`https://bsky.app/profile/${handle}`}
                    target="_blank"
                    rel="noopener"
                    className="font-semibold hover:underline"
                  >
                    {displayName}
                  </a>
                  <span className="text-sm text-muted-foreground">
                    @{handle}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mb-8 grid gap-3 rounded-md border border-border/40 p-4 text-sm">
        <h3 className="font-semibold">Share</h3>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/r/${encoded}/og.png?dl=1`}
            download
            className="rounded-md border px-3 py-2 hover:bg-muted/50"
          >
            ⬇︎ Download OG image
          </a>
          <a
            href={`/r/${encoded}/og.png`}
            target="_blank"
            rel="noopener"
            className="rounded-md border px-3 py-2 hover:bg-muted/50"
          >
            ↗ Open OG image
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          The image above is generated from this URL. Anyone with this link
          can verify the result — the snapshot is signed.
        </p>
      </section>

      <footer className="mt-12 text-xs text-muted-foreground">
        <a href="/" className="underline">
          ← New raffle
        </a>
      </footer>
    </div>
  )
}
