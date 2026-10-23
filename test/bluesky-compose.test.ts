import { describe, expect, it } from "vitest"

import {
  MAX_POST_GRAPHEMES,
  buildComposeText,
  buildComposeUrl,
  countGraphemes,
  type ComposeTemplate,
} from "@/lib/bluesky-compose"

const PT: ComposeTemplate = {
  intro: "Resultado do sorteio",
  summary: "{winners} {label} entre {pool} participantes.",
  winner: "ganhador",
  winners: "ganhadores",
  locale: "pt-BR",
}
const EN: ComposeTemplate = {
  intro: "Giveaway result",
  summary: "{winners} {label} among {pool} participants.",
  winner: "winner",
  winners: "winners",
  locale: "en-US",
}
const SHORT = "https://sorteio.blue/s/Qj7XT"

describe("buildComposeText", () => {
  it("builds the pt text with the link last", () => {
    expect(
      buildComposeText(PT, {
        title: "Sorteio de aniversário",
        winnerCount: 3,
        poolSize: 1234,
        link: SHORT,
      })
    ).toBe(
      `Resultado do sorteio: Sorteio de aniversário\n3 ganhadores entre 1.234 participantes.\n${SHORT}`
    )
  })

  it("builds the en text and singular label", () => {
    expect(
      buildComposeText(EN, {
        title: "Birthday",
        winnerCount: 1,
        poolSize: 42,
        link: "https://skypicker.site/s/abcd",
      })
    ).toBe(
      "Giveaway result: Birthday\n1 winner among 42 participants.\nhttps://skypicker.site/s/abcd"
    )
  })

  it("omits the title line when there is none", () => {
    const text = buildComposeText(PT, {
      winnerCount: 2,
      poolSize: 10,
      link: SHORT,
    })
    expect(text).toBe(
      `Resultado do sorteio\n2 ganhadores entre 10 participantes.\n${SHORT}`
    )
  })

  it("trims a long title to stay within the limit", () => {
    const text = buildComposeText(PT, {
      title: "x".repeat(500),
      winnerCount: 3,
      poolSize: 100,
      link: SHORT,
    })
    expect(countGraphemes(text)).toBeLessThanOrEqual(MAX_POST_GRAPHEMES)
    expect(text).toContain("…")
    expect(text.endsWith(SHORT)).toBe(true)
  })

  it("drops optional parts before the link with a long full URL", () => {
    const longLink = `https://sorteio.blue/r/${"a".repeat(240)}`
    const text = buildComposeText(PT, {
      title: "Sorteio",
      winnerCount: 3,
      poolSize: 100,
      link: longLink,
    })
    expect(countGraphemes(text)).toBeLessThanOrEqual(MAX_POST_GRAPHEMES)
    expect(text).toBe(`Resultado do sorteio\n${longLink}`)
  })

  it("falls back to the bare link when even the intro does not fit", () => {
    const longLink = `https://sorteio.blue/r/${"a".repeat(280)}`
    expect(
      buildComposeText(PT, { winnerCount: 1, poolSize: 5, link: longLink })
    ).toBe(longLink)
  })

  it("counts graphemes, not UTF-16 units", () => {
    expect(countGraphemes("👨‍👩‍👧🎉")).toBe(2)
  })
})

describe("buildComposeUrl", () => {
  it("url-encodes the text into the compose intent", () => {
    expect(buildComposeUrl("a b\nc")).toBe(
      "https://bsky.app/intent/compose?text=a%20b%0Ac"
    )
  })
})
