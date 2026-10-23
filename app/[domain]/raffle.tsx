"use client"

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react"

import {
  clampWinnerCount,
  collectParticipants,
  fetchProfiles,
  MAX_WINNERS,
  MIN_WINNERS,
  pickWinners,
  resolvePostUri,
  type FilterMode,
  type ProfileView,
  type RaffleProgress,
} from "@/lib/raffle"
import type { SiteContent } from "@/lib/site"
import { SignIn } from "@/components/sign-in"

export type RaffleStrings = SiteContent["raffle"] & {
  signin: SiteContent["signin"]
  intro: SiteContent["intro"]
}

const MODES: FilterMode[] = ["or", "and", "likes", "reposts"]

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="sp-status sp-status-error">
      ✕ {message}
    </p>
  )
}

export function Raffle({
  sessionDid,
  sessionHandle,
  strings,
  locale,
  initialError,
}: {
  sessionDid: string | null
  sessionHandle: string | null
  strings: RaffleStrings
  /** BCP 47 locale for number formatting. */
  locale: string
  initialError?: string
}) {
  const [postUrl, setPostUrl] = useState("")
  const [title, setTitle] = useState("")
  const [mode, setMode] = useState<FilterMode>("or")
  const [count, setCount] = useState("1")
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<string | null>(null)
  const [progress, setProgress] = useState<RaffleProgress | null>(null)
  const [winners, setWinners] = useState<ProfileView[] | null>(null)
  const [totals, setTotals] = useState<{
    likes: number
    reposts: number
    uri: string
    authorHandle: string
    mode: FilterMode
    title?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [snapshotPath, setSnapshotPath] = useState<string | null>(null)
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function reset() {
    setBusy(false)
    setPhase(null)
    setProgress(null)
  }

  async function onSortear(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setWinners(null)
    setTotals(null)
    setSnapshotPath(null)
    setCopied(false)
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    try {
      setPhase(strings.progress.resolving)
      const post = await resolvePostUri(postUrl, signal)

      setPhase(strings.progress.fetching)
      const { pool, totalLikes, totalReposts } = await collectParticipants(
        post.uri,
        mode,
        signal,
        (p) => setProgress(p)
      )

      if (pool.length === 0) {
        throw new Error(strings.noParticipants)
      }

      setPhase(strings.progress.sampling)
      const winnerDids = pickWinners(pool, clampWinnerCount(count))

      setPhase(strings.progress.fetchingProfiles)
      const profiles = await fetchProfiles(winnerDids, signal)

      setTotals({
        likes: totalLikes,
        reposts: totalReposts,
        uri: post.uri,
        authorHandle: post.authorHandle,
        mode,
        title: title.trim() || undefined,
      })
      setWinners(profiles)
      reset()
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        reset()
        return
      }
      setError((err as Error).message)
      reset()
    }
  }

  async function onCreateSnapshot() {
    if (!winners || !totals || snapshotBusy) return
    setSnapshotBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: totals.title,
          postUri: totals.uri,
          postHandle: totals.authorHandle,
          mode: totals.mode,
          totalLikes: totals.likes,
          totalReposts: totals.reposts,
          winners: winners.map((w) => ({
            did: w.did,
            handle: w.handle,
            displayName: w.displayName,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const { path } = (await res.json()) as { path: string }
      setSnapshotPath(path)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSnapshotBusy(false)
    }
  }

  async function onCopyLink() {
    if (!snapshotPath) return
    const fullUrl = window.location.origin + snapshotPath
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function onCancel() {
    abortRef.current?.abort()
    reset()
  }

  if (!sessionDid) {
    return (
      <SignIn
        strings={strings.signin}
        intro={strings.intro}
        error={
          error && <ErrorLine message={`${strings.signin.error} (${error})`} />
        }
      />
    )
  }

  return (
    <>
      <div className="sp-session meta">
        <span>
          {strings.signedInAs} <code>@{sessionHandle ?? sessionDid}</code>
        </span>
        <form action="/api/oauth/logout" method="POST">
          <button type="submit" className="sp-linkbutton">
            {strings.signOut}
          </button>
        </form>
      </div>

      <section className="panel cast">
        <h2 className="panel-h">{strings.panelTitle}</h2>
        <form onSubmit={onSortear} className="panel-b sp-stack">
          <p>
            <strong>{strings.intro.lead}</strong> {strings.intro.text}
          </p>
          <label className="field-block">
            <span className="label">{strings.postLabel}</span>
            <span className="field cast">
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder={strings.postUrlPlaceholder}
                required
                disabled={busy}
              />
            </span>
          </label>

          <label className="field-block">
            <span className="label">{strings.titleLabel}</span>
            <span className="field cast">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={strings.titlePlaceholder}
                maxLength={100}
                disabled={busy}
              />
            </span>
          </label>

          <div className="sp-row-fields">
            <label className="field-block m-0">
              <span className="label">{strings.modeLabel}</span>
              <span className="field cast">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as FilterMode)}
                  disabled={busy}
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {strings.modes[m]}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <label className="field-block m-0">
              <span className="label">{strings.countLabel}</span>
              <span className="field cast">
                <input
                  type="number"
                  min={MIN_WINNERS}
                  max={MAX_WINNERS}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  onBlur={() => setCount(String(clampWinnerCount(count)))}
                  disabled={busy}
                />
              </span>
            </label>
          </div>

          {busy ? (
            <button
              type="button"
              onClick={onCancel}
              className="btn lg cast press sp-submit"
            >
              {strings.cancel}
            </button>
          ) : (
            <button
              type="submit"
              className="btn lg primary cast press sp-submit"
            >
              {strings.submit}
            </button>
          )}

          {phase && (
            <p className="sp-status" aria-live="polite">
              {phase}
              {progress && (
                <>
                  {" — "}
                  {progress.likesDone ? "✓" : "…"}{" "}
                  {progress.likes.toLocaleString(locale)} {strings.likesLabel}
                  {" · "}
                  {progress.repostsDone ? "✓" : "…"}{" "}
                  {progress.reposts.toLocaleString(locale)}{" "}
                  {strings.repostsLabel}
                </>
              )}
            </p>
          )}

          {error && <ErrorLine message={error} />}
        </form>
      </section>

      {winners && totals && (
        <section className="panel cast sp-results" aria-live="polite">
          <h2 className="panel-h">
            {winners.length}{" "}
            {winners.length === 1 ? strings.winner : strings.winners}
          </h2>
          <p className="meta panel-b">
            {strings.poolLabel}: {totals.likes.toLocaleString(locale)}{" "}
            {strings.likesLabel} · {totals.reposts.toLocaleString(locale)}{" "}
            {strings.repostsLabel}
          </p>
          <ol className="sp-winners sp-section">
            {winners.map((profile, i) => (
              <li key={profile.did}>
                <a
                  href={`https://bsky.app/profile/${profile.handle}`}
                  target="_blank"
                  rel="noopener"
                  className="sp-row"
                >
                  <span className="sp-rank">{i + 1}</span>
                  {profile.avatar ? (
                    <span className="sp-avatar">
                      <img
                        src={profile.avatar}
                        alt=""
                        className="sp-avatar-image"
                      />
                    </span>
                  ) : (
                    <span className="sp-avatar screen" />
                  )}
                  <span className="sp-who">
                    <span className="sp-name">
                      {profile.displayName || profile.handle}
                    </span>
                    <span className="sp-handle">@{profile.handle}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>

          <div className="panel-b sp-section sp-stack">
            <span className="label m-0">{strings.shareTitle}</span>
            {!snapshotPath ? (
              <button
                type="button"
                onClick={onCreateSnapshot}
                disabled={snapshotBusy}
                className="btn primary cast press sp-submit"
              >
                {snapshotBusy
                  ? strings.creatingSnapshot
                  : strings.createSnapshot}
              </button>
            ) : (
              <div className="sp-actions">
                <a
                  href={snapshotPath}
                  target="_blank"
                  rel="noopener"
                  className="btn primary cast press"
                >
                  {strings.openSnapshot} ↗
                </a>
                <button
                  type="button"
                  onClick={onCopyLink}
                  className="btn cast press"
                >
                  {copied ? `✓ ${strings.copied}` : strings.copyLink}
                </button>
                <a
                  href={`${snapshotPath}/og.png?dl=1`}
                  download
                  className="btn cast press"
                >
                  {strings.downloadOg}
                </a>
              </div>
            )}
            <p className="hint m-0">{strings.snapshotHint}</p>
          </div>
        </section>
      )}
    </>
  )
}
