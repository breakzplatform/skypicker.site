/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

import { brand } from "./brand"
import type { KnownDomain } from "./hosts"
import { fitOgText, winnerGrid } from "./og-layout"
import type { Snapshot } from "./snapshot"

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = "image/png"

/*
 * The images follow the joseli.to DS light theme: newsprint paper, Computer
 * Modern, 2px-at-1x square blocks with a halftone dot shadow and a tilted ink
 * block on the wordmark. Satori cannot read woff2, so the CMU faces ship here
 * as Latin/Greek/Cyrillic TTF subsets of the "computer-modern" npm package
 * (the same binaries static.joseli.to serves as woff2).
 */
const FONT_DIR = join(process.cwd(), "assets", "fonts")

const SERIF = "CMU Serif"
const SANS = "CMU Sans Serif"
const MONO = "CMU Typewriter Text"

type OgFont = {
  name: string
  data: Buffer
  weight: 500 | 700
  style: "normal"
}

const FONT_FILES: Array<[string, 500 | 700, string]> = [
  [SERIF, 700, "cmu-serif-700-roman.ttf"],
  [SANS, 500, "cmu-sans-serif-500-roman.ttf"],
  [SANS, 700, "cmu-sans-serif-700-roman.ttf"],
  [MONO, 700, "cmu-typewriter-text-700-roman.ttf"],
]

let fontsPromise: Promise<OgFont[]> | null = null

function loadFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ([name, weight, file]) => ({
      name,
      data: await readFile(join(FONT_DIR, file)),
      weight,
      style: "normal" as const,
    }))
  )
  return fontsPromise
}

/* The DS geometry scaled for a 1200px card: 4px rules, a 6px dot pitch and a 16px shadow offset. */
const BORDER = 4
const DOT_PITCH = 6
const SHADOW = 16
const TILT = "rotate(1.5deg)"

type Locale = "en" | "pt"

const SITE: Record<
  KnownDomain,
  { name: string; suffix: string; locale: Locale; tagline: string }
> = {
  "skypicker.site": {
    name: "skypicker",
    suffix: ".site",
    locale: "en",
    tagline: "Giveaways on Bluesky and the Atmosphere",
  },
  "sorteio.blue": {
    name: "sorteio",
    suffix: ".blue",
    locale: "pt",
    tagline: "Sorteios no Bluesky e na Atmosphere",
  },
}

const LABELS = {
  en: {
    kicker: "Raffle result",
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
    kicker: "Resultado do sorteio",
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

/* Satori only honours percentage stops here; in a square cell the default
   ellipse is a circle and 46% of its farthest-corner radius is ~2px. */
function dotField(color: string = brand.text): React.CSSProperties {
  return {
    backgroundImage: `radial-gradient(${color} 46%, transparent 52%)`,
    backgroundSize: `${DOT_PITCH}px ${DOT_PITCH}px`,
    backgroundRepeat: "repeat",
  }
}

/** A square block with a 2px (here 4px) rule casting a halftone shadow. */
function Cast({
  width,
  height,
  background = brand.card,
  style,
  children,
}: {
  width?: number
  height?: number
  background?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", position: "relative", width, height }}>
      <div
        style={{
          position: "absolute",
          left: SHADOW,
          top: SHADOW,
          width: "100%",
          height: "100%",
          display: "flex",
          ...dotField(),
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          border: `${BORDER}px solid ${brand.text}`,
          background,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Wordmark({ domain, size }: { domain: KnownDomain; size: number }) {
  const site = SITE[domain]
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.18,
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color: brand.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <span>{site.name}</span>
        <span
          style={{
            marginLeft: size * 0.04,
            lineHeight: 0.8,
            padding: `${size * 0.08}px ${size * 0.07}px ${size * 0.04}px`,
            background: brand.ink,
            color: brand.onInk,
            transform: TILT,
          }}
        >
          {site.suffix}
        </span>
      </div>
    </div>
  )
}

function Meta({
  children,
  size = 22,
  color = brand.text3,
}: {
  children: React.ReactNode
  size?: number
  color?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </div>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: brand.paper,
        color: brand.text,
        fontFamily: SANS,
      }}
    >
      {children}
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
    <Page>
      <div
        style={{
          flex: 1,
          display: "flex",
          padding: "64px 76px 76px 64px",
        }}
      >
        <Cast
          width={1200 - 64 - 76}
          height={630 - 64 - 76}
          style={{ flexDirection: "column" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 24px",
              background: brand.ink,
              color: brand.onInk,
              borderBottom: `${BORDER}px solid ${brand.text}`,
            }}
          >
            <Meta size={22} color={brand.onInk}>
              {site.tagline}
            </Meta>
            <Meta size={22} color={brand.onInk}>
              {domain}
            </Meta>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 56px",
            }}
          >
            <Wordmark domain={domain} size={124} />
            <div
              style={{
                marginTop: 40,
                fontSize: 38,
                fontWeight: 700,
                lineHeight: 1.25,
                color: brand.text,
                display: "flex",
              }}
            >
              {subtitle}
            </div>
          </div>
        </Cast>
      </div>
    </Page>,
    { ...OG_SIZE, fonts: await loadFonts() }
  )
}

const MAX_AVATARS = 10

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

function FittedText({
  text,
  width,
  maximumSize,
  minimumSize,
  maximumLines,
  monospace = false,
  color = brand.text,
}: {
  text: string
  width: number
  maximumSize: number
  minimumSize: number
  maximumLines: number
  monospace?: boolean
  color?: string
}) {
  const fitted = fitOgText(text, {
    width,
    maximumSize,
    minimumSize,
    maximumLines,
    monospace,
  })
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        fontFamily: monospace ? MONO : SANS,
        fontWeight: 700,
        fontSize: fitted.fontSize,
        lineHeight: 1.15,
        color,
      }}
    >
      {fitted.lines.map((line, index) => (
        <div key={index} style={{ display: "flex", whiteSpace: "pre" }}>
          {line}
        </div>
      ))}
    </div>
  )
}

export async function renderSnapshotImage(
  snapshot: Snapshot,
  domain: KnownDomain = "skypicker.site",
  avatarOverrides?: ReadonlyMap<string, string>
): Promise<ImageResponse> {
  const site = SITE[domain]
  const labels = LABELS[site.locale]
  const numberLocale = site.locale === "pt" ? "pt-BR" : "en-US"
  const winners = snapshot.w.slice(0, MAX_AVATARS)
  const remaining = snapshot.w.length - winners.length
  const grid = winnerGrid(winners.length)
  const avatars =
    avatarOverrides ?? (await fetchAvatars(winners.map((w) => w.did)))
  const metadata = `${snapshot.w.length} ${snapshot.w.length === 1 ? labels.winner : labels.winners} · ${participantCount(snapshot).toLocaleString(numberLocale)} ${labels.participants} · ${labels.modes[snapshot.m]}${snapshot.ph ? ` · @${snapshot.ph}` : ""}`

  return new ImageResponse(
    <Page>
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 64,
          width: 1072,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Wordmark domain={domain} size={46} />
        <Meta size={20}>{formatDate(snapshot.ts, site.locale)}</Meta>
      </div>
      <div
        style={{
          position: "absolute",
          top: 112,
          left: 64,
          width: 1072,
          height: 12,
          borderTop: `6px solid ${brand.text}`,
          borderBottom: `2px solid ${brand.text}`,
          display: "flex",
        }}
      />
      <div
        style={{ position: "absolute", top: 142, left: 64, display: "flex" }}
      >
        <Meta size={22} color={brand.spot}>
          {labels.kicker}
        </Meta>
      </div>
      <div
        style={{ position: "absolute", top: 173, left: 64, display: "flex" }}
      >
        <FittedText
          text={snapshot.t ?? labels.fallbackTitle}
          width={1072}
          maximumSize={58}
          minimumSize={32}
          maximumLines={2}
        />
      </div>
      <div
        style={{ position: "absolute", top: 253, left: 64, display: "flex" }}
      >
        <FittedText
          text={metadata}
          width={1072}
          maximumSize={20}
          minimumSize={14}
          maximumLines={2}
          monospace
          color={brand.text3}
        />
      </div>
      {winners.map((winner, index) => {
        const left = 64 + (index % grid.columns) * (grid.width + grid.gap)
        const top =
          (grid.rows > 1 ? 300 : 322) +
          Math.floor(index / grid.columns) * (grid.height + grid.gap)
        const compact = grid.rows > 1
        return (
          <div
            key={winner.did}
            style={{
              position: "absolute",
              left,
              top,
              display: "flex",
              flexDirection: "column",
              width: grid.width,
            }}
          >
            <div
              style={{ display: "flex", position: "relative", paddingLeft: 8 }}
            >
              <Cast
                width={grid.avatarSize}
                height={grid.avatarSize}
                background={brand.sunken}
              >
                {avatars.has(winner.did) ? (
                  <img
                    src={avatars.get(winner.did)}
                    alt=""
                    width={grid.avatarSize - 2 * BORDER}
                    height={grid.avatarSize - 2 * BORDER}
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "100%",
                      ...dotField(brand.ink),
                    }}
                  />
                )}
              </Cast>
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: compact ? 26 : 36,
                  height: compact ? 26 : 36,
                  padding: "0 4px",
                  background: brand.ink,
                  color: brand.onInk,
                  border: `2px solid ${brand.text}`,
                  fontFamily: SERIF,
                  fontWeight: 700,
                  fontSize: compact ? 18 : 24,
                }}
              >
                {index + 1}
              </div>
            </div>
            <div style={{ display: "flex", marginTop: compact ? 18 : 22 }}>
              <FittedText
                text={winner.n || winner.h}
                width={grid.width}
                maximumSize={compact ? 18 : 28}
                minimumSize={compact ? 12 : 18}
                maximumLines={compact ? 2 : 3}
              />
            </div>
            <div style={{ display: "flex", marginTop: 3 }}>
              <FittedText
                text={`@${winner.h}`}
                width={grid.width}
                maximumSize={compact ? 15 : 24}
                minimumSize={compact ? 12 : 13}
                maximumLines={3}
                monospace
                color={brand.text3}
              />
            </div>
          </div>
        )
      })}
      {remaining > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            right: 64,
            display: "flex",
            color: brand.ink,
            fontSize: 18,
          }}
        >
          {labels.more(remaining)}
        </div>
      )}
    </Page>,
    { ...OG_SIZE, fonts: await loadFonts() }
  )
}
