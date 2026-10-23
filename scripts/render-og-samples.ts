import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { renderSnapshotImage } from "../lib/og-image"
import { buildSnapshot } from "../lib/snapshot"

async function main() {
  const directory = process.argv[2]
  if (!directory) throw new Error("usage: render-og-samples.ts <output-dir>")
  await mkdir(directory, { recursive: true })
  for (const count of [1, 2, 5, 10, 20, 50]) {
    for (const long of [false, true]) {
      const snapshot = buildSnapshot({
        creatorDid: "did:plc:example",
        title: long
          ? "A giveaway with long names · Sorteio com nomes longos"
          : "Community giveaway",
        postUri: "at://did:plc:example/app.bsky.feed.post/example",
        mode: "or",
        totalLikes: 120,
        totalReposts: 80,
        winners: Array.from({ length: count }, (_, index) => ({
          did: `did:plc:winner${index}`,
          h: long
            ? "a-very-long-handle-name.some-very-long-subdomain.another.example.com"
            : `winner${index + 1}.bsky.social`,
          n: long
            ? [
                "A very long display name with WWW and more letters",
                "山田太郎と世界の友達",
                "👩🏽‍💻 Café · Привет мир",
              ][index % 3]
            : `Winner ${index + 1}`,
        })),
      })
      snapshot.ts = Date.UTC(2026, 9, 23, 12)
      const image = await renderSnapshotImage(
        snapshot,
        long ? "sorteio.blue" : "skypicker.site",
        new Map()
      )
      await writeFile(
        join(directory, `${count}-winners${long ? "-long" : ""}.png`),
        Buffer.from(await image.arrayBuffer())
      )
    }
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
