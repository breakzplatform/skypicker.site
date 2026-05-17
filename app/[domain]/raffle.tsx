"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"

import {
  collectParticipants,
  fetchProfiles,
  pickWinners,
  resolvePostUri,
  type FilterMode,
  type ProfileView,
  type RaffleProgress,
} from "@/lib/raffle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"

type Strings = {
  postUrlPlaceholder: string
  modeLabel: string
  countLabel: string
  submit: string
  modes: { likes: string; reposts: string; and: string; or: string }
  progress: {
    resolving: string
    fetching: string
    sampling: string
    fetchingProfiles: string
  }
  winner: string
  winners: string
  poolLabel: string
  likesLabel: string
  repostsLabel: string
  cancel: string
  signedInAs: string
  signOut: string
  loginCta: string
  loginPlaceholder: string
  loginButton: string
  titlePlaceholder: string
  createSnapshot: string
  creatingSnapshot: string
  openSnapshot: string
  copyLink: string
  copied: string
  downloadOg: string
  snapshotHint: string
}

export type RaffleStrings = Strings

export function Raffle({
  sessionDid,
  sessionHandle,
  strings,
  initialError,
}: {
  sessionDid: string | null
  sessionHandle: string | null
  strings: Strings
  initialError?: string
}) {
  const [postUrl, setPostUrl] = useState("")
  const [title, setTitle] = useState("")
  const [mode, setMode] = useState<FilterMode>("or")
  const [count, setCount] = useState(1)
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
  const [loginHandle, setLoginHandle] = useState("")
  const pathname = usePathname()

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
        throw new Error("no participants found")
      }

      setPhase(strings.progress.sampling)
      const winnerDids = pickWinners(pool, count)

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
      <div className="grid w-full items-center gap-3 lg:max-w-2xl">
        <p className="text-sm text-muted-foreground">{strings.loginCta}</p>
        <form action="/api/oauth/login" method="GET" className="flex gap-2">
          <input type="hidden" name="handle" value={loginHandle} />
          <input type="hidden" name="return_to" value={pathname || "/"} />
          <Button type="submit">{strings.loginButton}</Button>
        </form>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Use a custom handle / PDS</summary>
          <div className="mt-2 flex gap-2">
            <Input
              type="text"
              value={loginHandle}
              onChange={(e) => setLoginHandle(e.target.value)}
              placeholder={strings.loginPlaceholder}
            />
          </div>
        </details>
        {error && (
          <p className="flex flex-row items-center gap-2 text-sm text-red-400">
            <X className="h-4 w-4" /> {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid w-full items-center gap-3 lg:max-w-2xl">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {strings.signedInAs}{" "}
          <code className="font-mono">{sessionHandle ?? sessionDid}</code>
        </span>
        <a href="/api/oauth/logout" className="underline">
          {strings.signOut}
        </a>
      </div>

      <form onSubmit={onSortear} className="grid gap-2">
        <Input
          type="url"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder={strings.postUrlPlaceholder}
          required
          disabled={busy}
        />
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={strings.titlePlaceholder}
          maxLength={100}
          disabled={busy}
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid flex-1 gap-1 text-xs">
            <span className="text-muted-foreground">{strings.modeLabel}</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as FilterMode)}
              disabled={busy}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="or">{strings.modes.or}</option>
              <option value="and">{strings.modes.and}</option>
              <option value="likes">{strings.modes.likes}</option>
              <option value="reposts">{strings.modes.reposts}</option>
            </select>
          </label>

          <label className="grid w-32 gap-1 text-xs">
            <span className="text-muted-foreground">{strings.countLabel}</span>
            <Input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(1000, Number(e.target.value))))
              }
              disabled={busy}
            />
          </label>

          {busy ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {strings.cancel}
            </Button>
          ) : (
            <Button type="submit">{strings.submit}</Button>
          )}
        </div>

        {phase && (
          <p className="text-sm text-muted-foreground">
            {phase}
            {progress && (
              <>
                {" — "}
                {progress.likesDone ? "✓" : "⋯"} {progress.likes.toLocaleString()} likes
                {" / "}
                {progress.repostsDone ? "✓" : "⋯"}{" "}
                {progress.reposts.toLocaleString()} reposts
              </>
            )}
          </p>
        )}

        {error && (
          <p className="flex flex-row items-center gap-2 text-sm text-red-400">
            <X className="h-4 w-4" /> {error}
          </p>
        )}
      </form>

      {winners && totals && (
        <div className="mt-6 grid gap-4">
          <h2 className="text-2xl font-bold">
            {winners.length}{" "}
            {winners.length === 1 ? strings.winner : strings.winners}
          </h2>
          <p className="text-xs text-muted-foreground">
            {strings.poolLabel}: {totals.likes.toLocaleString()}{" "}
            {strings.likesLabel} · {totals.reposts.toLocaleString()}{" "}
            {strings.repostsLabel}
          </p>
          <div className="grid gap-3">
            {winners.map((profile, i) => (
              <a
                key={profile.did}
                href={`https://bsky.app/profile/${profile.handle}`}
                target="_blank"
                rel="noopener"
                className="relative"
              >
                <div className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs dark:bg-slate-800">
                  {i + 1}
                </div>
                <Profile profile={profile} className="pl-6" />
              </a>
            ))}
          </div>

          <div className="mt-4 grid gap-3 rounded-md border border-border/40 p-3 text-sm">
            {!snapshotPath ? (
              <Button
                type="button"
                onClick={onCreateSnapshot}
                disabled={snapshotBusy}
              >
                {snapshotBusy
                  ? strings.creatingSnapshot
                  : strings.createSnapshot}
              </Button>
            ) : (
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={snapshotPath}
                    target="_blank"
                    rel="noopener"
                    className="rounded-md border px-3 py-2 text-xs hover:bg-muted/50"
                  >
                    ↗ {strings.openSnapshot}
                  </a>
                  <button
                    type="button"
                    onClick={onCopyLink}
                    className="rounded-md border px-3 py-2 text-xs hover:bg-muted/50"
                  >
                    {copied ? `✓ ${strings.copied}` : `⎘ ${strings.copyLink}`}
                  </button>
                  <a
                    href={`${snapshotPath}/og.png?dl=1`}
                    download
                    className="rounded-md border px-3 py-2 text-xs hover:bg-muted/50"
                  >
                    ⬇︎ {strings.downloadOg}
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  {strings.snapshotHint}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
