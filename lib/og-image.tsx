/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

import { brand } from "./brand"
import type { KnownDomain } from "./hosts"
import type { Snapshot } from "./snapshot"

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = "image/png"

const FONT_DIR = join(process.cwd(), "assets", "fonts")
const ink = brand.dark.ink
const onInk = brand.dark.onInk

type OgFont = {
  name: string
  data: Buffer
  weight: 500 | 800
  style: "normal"
}

let fontsPromise: Promise<OgFont[]> | null = null

function loadFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    ([500, 800] as const).map(async (weight) => ({
      name: "Inter",
      data: await readFile(join(FONT_DIR, `Inter-${weight}.ttf`)),
      weight,
      style: "normal" as const,
    }))
  )
  return fontsPromise
}

type Locale = "en" | "pt"

const SITE: Record<KnownDomain, { name: string; locale: Locale }> = {
  "skypicker.site": { name: "SkyPicker", locale: "en" },
  "sorteio.blue": { name: "sorteio.blue", locale: "pt" },
}

const LABELS = {
  en: {
    fallbackTitle: "Bluesky giveaway",
    winner: "winner",
    winners: "winners",
    participants: "participants",
    modes: {
      likes: "Likes",
      reposts: "Reposts",
      and: "Likes and reposts",
      or: "Likes or reposts",
    },
    more: (n: number) => `+${n} more`,
  },
  pt: {
    fallbackTitle: "Sorteio no Bluesky",
    winner: "ganhador",
    winners: "ganhadores",
    participants: "participantes",
    modes: {
      likes: "Likes",
      reposts: "Reposts",
      and: "Likes e reposts",
      or: "Likes ou reposts",
    },
    more: (n: number) => `+${n} ${n === 1 ? "outro" : "outros"}`,
  },
} satisfies Record<Locale, unknown>

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill={ink} />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke={onInk}
        strokeWidth="7"
      />
      <circle cx="32" cy="32" r="6.5" fill={onInk} />
    </svg>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: brand.night,
        color: brand.cream,
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 14,
          background: ink,
          display: "flex",
        }}
      />
    </div>
  )
}

/** Static social card for a domain's home page (written to public/ by scripts/brand-assets.tsx). */
export async function renderHomeImage(
  domain: KnownDomain,
  subtitle: string
): Promise<ImageResponse> {
  const site = SITE[domain]
  return new ImageResponse(
    (
      <Frame>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 96px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <Mark size={132} />
            <div
              style={{
                fontSize: 136,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {site.name}
            </div>
          </div>
          <div
            style={{
              marginTop: 48,
              fontSize: 40,
              fontWeight: 500,
              lineHeight: 1.25,
              opacity: 0.85,
              maxWidth: 1008,
              display: "flex",
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 32,
              fontWeight: 800,
              color: ink,
              display: "flex",
            }}
          >
            {domain}
          </div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: await loadFonts() }
  )
}

const AVATAR_SIZE = 132
const MAX_AVATARS = 5

const PUBLIC_APPVIEW = "https://public.api.bsky.app"
const AVATAR_TIMEOUT_MS = 3000

/** One bounded AppView call; the snapshot stores no avatar, so look them up live. */
async function fetchAvatars(dids: string[]): Promise<Map<string, string>> {
  const avatars = new Map<string, string>()
  if (dids.length === 0) return avatars
  const url = new URL(`${PUBLIC_APPVIEW}/xrpc/app.bsky.actor.getProfiles`)
  for (const did of dids) url.searchParams.append("actors", did)
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS),
    })
    if (!res.ok) return avatars
    const data = (await res.json()) as {
      profiles: Array<{ did: string; avatar?: string }>
    }
    for (const profile of data.profiles) {
      // Satori cannot decode WebP; ask the CDN for JPEG explicitly.
      if (profile.avatar) {
        avatars.set(profile.did, profile.avatar.replace(/@\w+$/, "") + "@jpeg")
      }
    }
  } catch {}
  return avatars
}

function formatDate(ts: number, locale: Locale): string {
  return (
    new Date(ts).toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC"
  )
}

function participantCount(snapshot: Snapshot): number {
  const [likes, reposts] = snapshot.tl
  switch (snapshot.m) {
    case "and":
      return Math.min(likes, reposts)
    case "or":
      return likes + reposts
    case "likes":
      return likes
    case "reposts":
      return reposts
  }
}

export async function renderSnapshotImage(
  snapshot: Snapshot,
  domain: KnownDomain = "skypicker.site"
): Promise<ImageResponse> {
  const site = SITE[domain]
  const labels = LABELS[site.locale]
  const numberLocale = site.locale === "pt" ? "pt-BR" : "en-US"
  const winners = snapshot.w.slice(0, MAX_AVATARS)
  const remaining = snapshot.w.length - winners.length
  const title = snapshot.t ?? labels.fallbackTitle
  const avatars = await fetchAvatars(winners.map((w) => w.did))

  return new ImageResponse(
    (
      <Frame>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "56px 72px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              <Mark size={48} />
              {site.name}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 500,
                opacity: 0.7,
                display: "flex",
              }}
            >
              {formatDate(snapshot.ts, site.locale)}
            </div>
          </div>

          <div
            style={{
              marginTop: 44,
              fontSize: title.length > 40 ? 52 : 68,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              display: "flex",
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 26,
              fontWeight: 500,
              opacity: 0.8,
              display: "flex",
            }}
          >
            {`${snapshot.w.length} ${snapshot.w.length === 1 ? labels.winner : labels.winners} · ${participantCount(snapshot).toLocaleString(numberLocale)} ${labels.participants} · ${labels.modes[snapshot.m]}${snapshot.ph ? ` · @${snapshot.ph}` : ""}`}
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              gap: 28,
              alignItems: "flex-start",
            }}
          >
            {winners.map((w, i) => (
              <div
                key={w.did}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: AVATAR_SIZE + 28,
                }}
              >
                <div
                  style={{
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    display: "flex",
                    position: "relative",
                  }}
                >
                  {avatars.has(w.did) ? (
                    <img
                      src={avatars.get(w.did)}
                      alt=""
                      width={AVATAR_SIZE}
                      height={AVATAR_SIZE}
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: AVATAR_SIZE,
                        border: `5px solid ${ink}`,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: AVATAR_SIZE,
                        border: `5px solid ${ink}`,
                        background: "rgba(254,243,226,0.12)",
                        display: "flex",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -6,
                      width: 42,
                      height: 42,
                      borderRadius: 42,
                      background: ink,
                      color: onInk,
                      fontSize: 22,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 20,
                    fontWeight: 800,
                    display: "flex",
                    justifyContent: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    maxWidth: "100%",
                  }}
                >
                  {(w.n ?? w.h).slice(0, 16)}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    opacity: 0.7,
                    display: "flex",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    maxWidth: "100%",
                  }}
                >
                  @{w.h.slice(0, 18)}
                </div>
              </div>
            ))}
            {remaining > 0 && (
              <div
                style={{
                  height: AVATAR_SIZE,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 30,
                  fontWeight: 800,
                  color: ink,
                  whiteSpace: "nowrap",
                }}
              >
                {labels.more(remaining)}
              </div>
            )}
          </div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: await loadFonts() }
  )
}
