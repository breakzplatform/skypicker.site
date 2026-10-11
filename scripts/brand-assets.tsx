/**
 * Regenerates the static brand assets in public/ from lib/brand.ts:
 * icon.svg, favicon.ico, apple-touch-icon.png and the home OG images.
 * Run with `pnpm brand-assets` after changing the palette, the mark or the copy.
 */
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import sharp from "sharp"

import content from "../data/content.json"
import { brand } from "../lib/brand"
import { KNOWN_DOMAINS } from "../lib/hosts"
import { renderHomeImage } from "../lib/og-image"

const PUBLIC_DIR = join(process.cwd(), "public")

/** The square target mark; same geometry as components/brand-mark.tsx. */
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${brand.ink}"/><circle cx="32" cy="32" r="18" fill="none" stroke="${brand.onInk}" stroke-width="7"/><circle cx="32" cy="32" r="6.5" fill="${brand.onInk}"/></svg>
`

async function png(size: number): Promise<Buffer> {
  return sharp(Buffer.from(markSvg), { density: 72 * (size / 64) * 4 })
    .resize(size, size)
    .png()
    .toBuffer()
}

/** ICO container holding PNG images (supported by every current browser). */
function ico(images: Array<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const entries: Buffer[] = []
  let offset = 6 + 16 * images.length
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    entries.push(entry)
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

async function main() {
  await writeFile(join(PUBLIC_DIR, "icon.svg"), markSvg)

  const icoSizes = [16, 32, 48]
  const icoImages = await Promise.all(
    icoSizes.map(async (size) => ({ size, data: await png(size) }))
  )
  await writeFile(join(PUBLIC_DIR, "favicon.ico"), ico(icoImages))

  // iOS applies its own mask, so the touch icon is the full-bleed square.
  await writeFile(join(PUBLIC_DIR, "apple-touch-icon.png"), await png(180))

  for (const domain of KNOWN_DOMAINS) {
    const image = await renderHomeImage(domain, content[domain].subtitle)
    await writeFile(
      join(PUBLIC_DIR, `og-${domain}.png`),
      Buffer.from(await image.arrayBuffer())
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
