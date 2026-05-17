/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og"

import type { Snapshot } from "./snapshot"

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = "image/png"

const MODE_LABELS: Record<Snapshot["m"], string> = {
  likes: "Likes",
  reposts: "Reposts",
  and: "Likes ∩ Reposts",
  or: "Likes ∪ Reposts",
}

const AVATAR_SIZE = 140
const MAX_AVATARS = 5

function avatarUrl(did: string): string {
  return `https://av-cdn.bsky.app/avatar/${did}@jpeg`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC"
}

export function renderSnapshotImage(snapshot: Snapshot): ImageResponse {
  const winners = snapshot.w.slice(0, MAX_AVATARS)
  const remaining = snapshot.w.length - winners.length
  const totalParticipants =
    snapshot.m === "and"
      ? Math.min(snapshot.tl[0], snapshot.tl[1])
      : snapshot.m === "or"
      ? snapshot.tl[0] + snapshot.tl[1]
      : snapshot.m === "likes"
      ? snapshot.tl[0]
      : snapshot.tl[1]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #0a1929 0%, #1976d2 50%, #208BFE 100%)",
          color: "white",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: 28,
              fontWeight: 700,
              opacity: 0.95,
            }}
          >
            🎯 SkyPicker
          </div>
          <div style={{ fontSize: 22, opacity: 0.75, display: "flex" }}>
            {formatDate(snapshot.ts)}
          </div>
        </div>

        <div
          style={{
            fontSize: snapshot.t ? 64 : 52,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "8px",
            display: "flex",
          }}
        >
          {snapshot.t ?? "Bluesky Raffle"}
        </div>

        <div
          style={{
            fontSize: 26,
            opacity: 0.85,
            marginBottom: "40px",
            display: "flex",
          }}
        >
          {snapshot.w.length}{" "}
          {snapshot.w.length === 1 ? "winner" : "winners"} ·{" "}
          {totalParticipants.toLocaleString("en-US")} participants ·{" "}
          {MODE_LABELS[snapshot.m]}
          {snapshot.ph ? ` · @${snapshot.ph}` : ""}
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {winners.map((w, i) => (
            <div
              key={w.did}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: AVATAR_SIZE + 24,
              }}
            >
              <div
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE,
                  border: "4px solid white",
                  overflow: "hidden",
                  display: "flex",
                  position: "relative",
                  background: "rgba(255,255,255,0.15)",
                }}
              >
                <img
                  src={avatarUrl(w.did)}
                  alt=""
                  width={AVATAR_SIZE}
                  height={AVATAR_SIZE}
                  style={{
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: -8,
                    left: -8,
                    width: 36,
                    height: 36,
                    borderRadius: 36,
                    background: "white",
                    color: "#0a1929",
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
                  marginTop: 12,
                  fontSize: 18,
                  fontWeight: 600,
                  textAlign: "center",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {(w.n ?? w.h).slice(0, 16)}
              </div>
              <div
                style={{
                  fontSize: 14,
                  opacity: 0.7,
                  display: "flex",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
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
                display: "flex",
                alignItems: "center",
                fontSize: 28,
                fontWeight: 700,
                opacity: 0.9,
                marginLeft: 12,
              }}
            >
              + {remaining} more
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 60,
            fontSize: 18,
            opacity: 0.7,
            display: "flex",
          }}
        >
          skypicker.site
        </div>
      </div>
    ),
    OG_SIZE
  )
}
