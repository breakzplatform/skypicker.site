const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), ({ segment }) => segment)
}

/** Conservative CMU width estimates; wide scripts and emoji occupy a full em. */
export function estimateTextWidth(
  text: string,
  size: number,
  monospace = false
): number {
  return graphemes(text).reduce((width, character) => {
    const factor =
      /\p{Extended_Pictographic}|[\u2e80-\u9fff\uac00-\ud7af]/u.test(character)
        ? 1.1
        : monospace
          ? 0.62
          : /[MW@%]/.test(character)
            ? 1
            : /[ilI.,' :;!|]/.test(character)
              ? 0.35
              : /[A-Z]/.test(character)
                ? 0.78
                : 0.62
    return width + factor * size
  }, 0)
}

export function fitOgText(
  text: string,
  options: {
    width: number
    maximumSize: number
    minimumSize: number
    maximumLines: number
    monospace?: boolean
  }
): { lines: string[]; fontSize: number; truncated: boolean } {
  const {
    width,
    maximumSize,
    minimumSize,
    maximumLines,
    monospace = false,
  } = options
  const normalized = text.replace(/\s+/gu, " ").trim()
  let fontSize = maximumSize
  while (
    fontSize > minimumSize &&
    estimateTextWidth(normalized, fontSize, monospace) > width
  )
    fontSize--
  const characters = graphemes(normalized)
  const lines: string[] = []
  let line = ""
  for (const character of characters) {
    if (
      line &&
      estimateTextWidth(line + character, fontSize, monospace) > width
    ) {
      lines.push(line)
      line = ""
    }
    line += character
  }
  if (line) lines.push(line)
  if (lines.length <= maximumLines) return { lines, fontSize, truncated: false }
  const visible = lines.slice(0, maximumLines)
  const last = graphemes(visible[maximumLines - 1])
  while (
    last.length &&
    estimateTextWidth(last.join("") + "…", fontSize, monospace) > width
  )
    last.pop()
  visible[maximumLines - 1] = last.join("") + "…"
  return { lines: visible, fontSize, truncated: true }
}

export function winnerGrid(count: number) {
  const columns = Math.min(5, Math.max(1, count))
  const rows = count > 5 ? 2 : 1
  const gap = 20
  return {
    columns,
    rows,
    gap,
    width: (1072 - (columns - 1) * gap) / columns,
    height: rows === 1 ? 250 : 136,
    avatarSize: rows === 1 ? 110 : 40,
  }
}
