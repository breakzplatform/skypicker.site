const COMPOSE_URL = "https://bsky.app/intent/compose"
export const MAX_POST_GRAPHEMES = 300

export type ComposeTemplate = {
  intro: string
  summary: string
  winner: string
  winners: string
  locale: string
}

export type ComposeInput = {
  title?: string
  winnerCount: number
  poolSize: number
  link: string
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

export function countGraphemes(text: string): number {
  let total = 0
  for (const _ of segmenter.segment(text)) total++
  return total
}

function truncate(text: string, max: number): string {
  const graphemes = Array.from(segmenter.segment(text), (s) => s.segment)
  if (graphemes.length <= max) return text
  return `${graphemes.slice(0, Math.max(0, max - 1)).join("").trimEnd()}…`
}

/**
 * Builds the post text for Bluesky's compose intent. The link goes last so the
 * composer builds a link card from it. When the text would exceed the limit,
 * optional parts go first: the title is trimmed, then the title is dropped,
 * then the summary line, then the intro.
 */
export function buildComposeText(
  template: ComposeTemplate,
  input: ComposeInput
): string {
  const format = new Intl.NumberFormat(template.locale)
  const summary = template.summary
    .replace("{winners}", format.format(input.winnerCount))
    .replace(
      "{label}",
      input.winnerCount === 1 ? template.winner : template.winners
    )
    .replace("{pool}", format.format(input.poolSize))
  const title = input.title?.trim()

  const assemble = (head: string, withSummary: boolean) =>
    [head, withSummary ? summary : null, input.link]
      .filter((line): line is string => Boolean(line))
      .join("\n")

  const withTitle = (value: string) => `${template.intro}: ${value}`
  if (title) {
    const full = assemble(withTitle(title), true)
    if (countGraphemes(full) <= MAX_POST_GRAPHEMES) return full
    const room =
      MAX_POST_GRAPHEMES - countGraphemes(assemble(withTitle(""), true))
    if (room >= 10) return assemble(withTitle(truncate(title, room)), true)
  }
  const plain = assemble(template.intro, true)
  if (countGraphemes(plain) <= MAX_POST_GRAPHEMES) return plain
  const introOnly = assemble(template.intro, false)
  return countGraphemes(introOnly) <= MAX_POST_GRAPHEMES
    ? introOnly
    : input.link
}

export function buildComposeUrl(text: string): string {
  return `${COMPOSE_URL}?text=${encodeURIComponent(text)}`
}
