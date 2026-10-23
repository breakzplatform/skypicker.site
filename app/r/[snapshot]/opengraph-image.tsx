import { headers } from "next/headers"

import { knownDomainForHost } from "@/lib/hosts"
import { OG_CONTENT_TYPE, OG_SIZE, renderSnapshotImage } from "@/lib/og-image"
import { decodeSnapshot } from "@/lib/snapshot"

export const runtime = "nodejs"
export const alt = "Bluesky raffle results"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({
  params,
}: {
  params: Promise<{ snapshot: string }>
}) {
  const { snapshot: encoded } = await params
  const snapshot = decodeSnapshot(encoded)
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? ""
  return renderSnapshotImage(snapshot, knownDomainForHost(host) ?? undefined)
}
