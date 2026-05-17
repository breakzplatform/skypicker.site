import { decodeSnapshot } from "@/lib/snapshot"
import { renderSnapshotImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image"

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
  return renderSnapshotImage(snapshot)
}
