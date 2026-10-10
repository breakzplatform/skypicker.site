import { type NextRequest } from "next/server"

import { knownDomainForHost } from "@/lib/hosts"
import { renderSnapshotImage } from "@/lib/og-image"
import { decodeSnapshot } from "@/lib/snapshot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snapshot: string }> }
) {
  const { snapshot: encoded } = await params

  let snapshot
  try {
    snapshot = decodeSnapshot(encoded)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.toLowerCase().includes("signature")) {
      console.warn("[og] invalid snapshot signature: %s", message)
    }
    return new Response("Not found", { status: 404 })
  }

  const wantsDownload =
    request.nextUrl.searchParams.get("download") === "1" ||
    request.nextUrl.searchParams.has("dl")

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host
  const domain = knownDomainForHost(host) ?? undefined
  const response = await renderSnapshotImage(snapshot, domain)
  const headers = new Headers(response.headers)
  if (wantsDownload) {
    const slug = (snapshot.t ?? "raffle")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "raffle"
    headers.set(
      "content-disposition",
      `attachment; filename="${slug}-${snapshot.ts}.png"`
    )
  }
  headers.set("cache-control", "public, max-age=31536000, immutable")

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
