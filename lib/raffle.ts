export type FilterMode = "likes" | "reposts" | "and" | "or"

export type RaffleProgress = {
  likes: number
  reposts: number
  likesDone: boolean
  repostsDone: boolean
}

export type RaffleResult = {
  pool: string[]
  totalLikes: number
  totalReposts: number
}

async function fetchPaged(
  endpoint: "/api/at/likes" | "/api/at/reposts",
  uri: string,
  signal: AbortSignal,
  onPage: (count: number, done: boolean) => void
): Promise<string[]> {
  const ids: string[] = []
  let cursor: string | null = null

  while (true) {
    if (signal.aborted) throw new Error("aborted")

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uri, cursor }),
      signal,
    })

    if (res.status === 429) {
      const raw = Number(res.headers.get("retry-after") ?? "5")
      const retryAfter = Math.min(
        Math.max(1, Number.isFinite(raw) ? raw : 5),
        120
      )
      await new Promise((r) => setTimeout(r, retryAfter * 1000))
      continue
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? `HTTP ${res.status}`)
    }

    const data = (await res.json()) as { dids: string[]; cursor: string | null }
    ids.push(...data.dids)
    cursor = data.cursor

    onPage(ids.length, !cursor)

    if (!cursor) return ids
  }
}

export async function collectParticipants(
  postUri: string,
  mode: FilterMode,
  signal: AbortSignal,
  onProgress: (p: RaffleProgress) => void
): Promise<RaffleResult> {
  const progress: RaffleProgress = {
    likes: 0,
    reposts: 0,
    likesDone: mode === "reposts",
    repostsDone: mode === "likes",
  }

  const tasks: Promise<string[]>[] = []
  const noLikes = mode === "reposts"
  const noReposts = mode === "likes"

  tasks.push(
    noLikes
      ? Promise.resolve([])
      : fetchPaged("/api/at/likes", postUri, signal, (n, done) => {
          progress.likes = n
          progress.likesDone = done
          onProgress({ ...progress })
        })
  )

  tasks.push(
    noReposts
      ? Promise.resolve([])
      : fetchPaged("/api/at/reposts", postUri, signal, (n, done) => {
          progress.reposts = n
          progress.repostsDone = done
          onProgress({ ...progress })
        })
  )

  const [likes, reposts] = await Promise.all(tasks)

  const pool = buildPool(likes, reposts, mode)

  return { pool, totalLikes: likes.length, totalReposts: reposts.length }
}

export const MIN_WINNERS = 1
export const MAX_WINNERS = 1000

/** Winner count from user input: an integer in [MIN_WINNERS, MAX_WINNERS]. */
export function clampWinnerCount(value: unknown): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return MIN_WINNERS
  return Math.max(MIN_WINNERS, Math.min(MAX_WINNERS, n))
}

/**
 * Unique participant DIDs for a filter mode. Pages can overlap when a post
 * gets new likes mid-collection, so every mode dedupes; order follows first
 * appearance (likes before reposts).
 */
export function buildPool(
  likes: readonly string[],
  reposts: readonly string[],
  mode: FilterMode
): string[] {
  switch (mode) {
    case "likes":
      return Array.from(new Set(likes))
    case "reposts":
      return Array.from(new Set(reposts))
    case "and": {
      const repostSet = new Set(reposts)
      return Array.from(new Set(likes.filter((d) => repostSet.has(d))))
    }
    case "or":
      return Array.from(new Set([...likes, ...reposts]))
  }
}

/** Uniform integer in [0, max) from the platform CSPRNG, without modulo bias. */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) {
    throw new RangeError(`invalid range: ${max}`)
  }
  const limit = 2 ** 32 - (2 ** 32 % max)
  const buf = new Uint32Array(1)
  while (true) {
    globalThis.crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

/**
 * Draws `count` distinct entries with a partial Fisher–Yates shuffle, so every
 * subset of the pool is equally likely. Returns the whole pool (shuffled) when
 * `count` exceeds it.
 */
export function pickWinners(
  pool: readonly string[],
  count: number,
  randomInt: (max: number) => number = secureRandomInt
): string[] {
  const n = Math.min(Math.floor(count), pool.length)
  if (!(n > 0)) return []

  const arr = pool.slice()
  for (let i = 0; i < n; i++) {
    const j = i + randomInt(arr.length - i)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

export type ProfileView = {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

export async function fetchProfiles(
  dids: string[],
  signal: AbortSignal
): Promise<ProfileView[]> {
  const result: ProfileView[] = []
  const batchSize = 25

  for (let i = 0; i < dids.length; i += batchSize) {
    if (signal.aborted) throw new Error("aborted")
    const batch = dids.slice(i, i + batchSize)
    const res = await fetch("/api/at/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dids: batch }),
      signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? `HTTP ${res.status}`)
    }
    const data = (await res.json()) as { profiles: ProfileView[] }
    result.push(...data.profiles)
  }

  return result
}

export type ResolvedPost = {
  uri: string
  authorDid: string
  authorHandle: string
}

export async function resolvePostUri(
  url: string,
  signal: AbortSignal
): Promise<ResolvedPost> {
  const res = await fetch("/api/at/post", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return (await res.json()) as ResolvedPost
}
