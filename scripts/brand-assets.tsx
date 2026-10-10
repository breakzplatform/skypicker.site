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

function markSvg(ink: string, onInk: string, radius = 14): string {
  return `<rect width="64" height="64" rx="${radius}" fill="${ink}"/><circle cx="32" cy="32" r="18" fill="none" stroke="${onInk}" stroke-width="7"/><circle cx="32" cy="32" r="6.5" fill="${onInk}"/>`
}

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<style>.ink{fill:${brand.light.ink}}.on{fill:${brand.light.onInk};stroke:${brand.light.onInk}}@media (prefers-color-scheme:dark){.ink{fill:${brand.dark.ink}}.on{fill:${brand.dark.onInk};stroke:${brand.dark.onInk}}}</style>
<rect class="ink" width="64" height="64" rx="14"/><circle class="on" cx="32" cy="32" r="18" fill="none" style="fill:none" stroke-width="7"/><circle class="on" cx="32" cy="32" r="6.5" stroke-width="0"/>
</svg>
`

function rasterSvg(radius: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${markSvg(brand.light.ink, brand.light.onInk, radius)}</svg>`
  )
}

async function png(size: number, radius: number): Promise<Buffer> {
  return sharp(rasterSvg(radius), { density: 72 * (size / 64) * 4 })
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
  await writeFile(join(PUBLIC_DIR, "icon.svg"), iconSvg)

  const icoSizes = [16, 32, 48]
  const icoImages = await Promise.all(
    icoSizes.map(async (size) => ({ size, data: await png(size, 14) }))
  )
  await writeFile(join(PUBLIC_DIR, "favicon.ico"), ico(icoImages))

  // iOS applies its own mask, so the touch icon is a full-bleed square.
  await writeFile(join(PUBLIC_DIR, "apple-touch-icon.png"), await png(180, 0))

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
