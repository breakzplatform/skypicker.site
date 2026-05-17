import { createHmac, timingSafeEqual } from "node:crypto"
import { deflateRawSync, inflateRawSync } from "node:zlib"

export const SNAPSHOT_VERSION = 1

export type FilterMode = "likes" | "reposts" | "and" | "or"

export type SnapshotWinner = {
  did: string
  h: string
  n?: string
}

export type Snapshot = {
  v: typeof SNAPSHOT_VERSION
  t?: string
  ts: number
  p: string
  ph?: string
  m: FilterMode
  tl: [number, number]
  w: SnapshotWinner[]
}

const MAX_TITLE_LENGTH = 100
const MAX_WINNERS = 100
const MAX_HANDLE_LENGTH = 253
const MAX_DISPLAY_NAME_LENGTH = 64
const MAX_PAYLOAD_BYTES = 6 * 1024

function getSecret(): Buffer {
  const secret = process.env.SNAPSHOT_SECRET ?? process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "SNAPSHOT_SECRET (or SESSION_SECRET) must be set to ≥32 chars"
    )
  }
  return Buffer.from(`snapshot-v${SNAPSHOT_VERSION}:${secret}`, "utf-8")
}

function sign(payload: Buffer): Buffer {
  return createHmac("sha256", getSecret()).update(payload).digest()
}

function isValidMode(m: unknown): m is FilterMode {
  return m === "likes" || m === "reposts" || m === "and" || m === "or"
}

function isValidDid(did: unknown): did is string {
  return (
    typeof did === "string" &&
    did.length <= 320 &&
    /^did:[a-z]+:[A-Za-z0-9._:%-]+$/i.test(did)
  )
}

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s
}

export function buildSnapshot(input: {
  title?: string
  postUri: string
  postHandle?: string
  mode: FilterMode
  totalLikes: number
  totalReposts: number
  winners: SnapshotWinner[]
}): Snapshot {
  if (!input.postUri || !input.postUri.startsWith("at://")) {
    throw new Error("postUri must be an at:// uri")
  }
  if (!isValidMode(input.mode)) {
    throw new Error("invalid mode")
  }
  if (!Array.isArray(input.winners) || input.winners.length === 0) {
    throw new Error("winners required")
  }
  if (input.winners.length > MAX_WINNERS) {
    throw new Error(`max ${MAX_WINNERS} winners per snapshot`)
  }

  const cleanWinners: SnapshotWinner[] = input.winners.map((w) => {
    if (!isValidDid(w.did)) throw new Error(`invalid did: ${w.did}`)
    if (typeof w.h !== "string" || !w.h) {
      throw new Error("winner handle required")
    }
    return {
      did: w.did,
      h: clamp(w.h, MAX_HANDLE_LENGTH),
      ...(w.n ? { n: clamp(w.n, MAX_DISPLAY_NAME_LENGTH) } : {}),
    }
  })

  return {
    v: SNAPSHOT_VERSION,
    ...(input.title ? { t: clamp(input.title.trim(), MAX_TITLE_LENGTH) } : {}),
    ts: Date.now(),
    p: input.postUri,
    ...(input.postHandle
      ? { ph: clamp(input.postHandle, MAX_HANDLE_LENGTH) }
      : {}),
    m: input.mode,
    tl: [
      Math.max(0, Math.floor(input.totalLikes)),
      Math.max(0, Math.floor(input.totalReposts)),
    ],
    w: cleanWinners,
  }
}

export function encodeSnapshot(snapshot: Snapshot): string {
  const json = Buffer.from(JSON.stringify(snapshot), "utf-8")
  const compressed = deflateRawSync(json, { level: 9 })
  if (compressed.length > MAX_PAYLOAD_BYTES) {
    throw new Error(
      `snapshot payload too large (${compressed.length} > ${MAX_PAYLOAD_BYTES} bytes)`
    )
  }
  const sig = sign(compressed)
  return `${compressed.toString("base64url")}.${sig.toString("base64url")}`
}

export function decodeSnapshot(encoded: string): Snapshot {
  const dot = encoded.indexOf(".")
  if (dot < 1 || dot === encoded.length - 1) {
    throw new Error("invalid snapshot format")
  }

  const payloadStr = encoded.slice(0, dot)
  const sigStr = encoded.slice(dot + 1)

  const payload = Buffer.from(payloadStr, "base64url")
  const sig = Buffer.from(sigStr, "base64url")

  if (payload.length === 0 || sig.length === 0) {
    throw new Error("invalid snapshot format")
  }
  if (payload.length > MAX_PAYLOAD_BYTES) {
    throw new Error("snapshot payload too large")
  }

  const expectedSig = sign(payload)
  if (
    sig.length !== expectedSig.length ||
    !timingSafeEqual(sig, expectedSig)
  ) {
    throw new Error("invalid signature")
  }

  const json = inflateRawSync(payload).toString("utf-8")
  const data = JSON.parse(json) as Snapshot

  if (data.v !== SNAPSHOT_VERSION) {
    throw new Error(`unsupported snapshot version: ${data.v}`)
  }
  if (!isValidMode(data.m)) {
    throw new Error("invalid mode in snapshot")
  }

  return data
}
