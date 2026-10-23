import { describe, expect, it } from "vitest"

import { estimateTextWidth, fitOgText, winnerGrid } from "@/lib/og-layout"

const longHandle =
  "@a-very-long-handle-name.some-very-long-subdomain.another.example.com"

describe("OG text layout", () => {
  it("uses the entire column before truncating a single winner", () => {
    const layout = fitOgText(longHandle, {
      width: 1072,
      maximumSize: 24,
      minimumSize: 14,
      maximumLines: 3,
      monospace: true,
    })
    expect(layout.lines.join("")).toBe(longHandle)
    expect(layout.truncated).toBe(false)
  })
  it("shrinks before wrapping, and wraps before ellipsis", () => {
    const options = {
      width: 210,
      maximumSize: 30,
      minimumSize: 14,
      maximumLines: 3,
      monospace: true,
    }
    const fitted = fitOgText("@alice.bsky.social", options)
    expect(fitted.fontSize).toBeLessThan(30)
    expect(fitted.lines).toHaveLength(1)
    const wrapped = fitOgText(longHandle, options)
    expect(wrapped.lines.length).toBeGreaterThan(1)
    expect(wrapped.lines.join("")).toBe(longHandle)
    const truncated = fitOgText(longHandle.repeat(5), options)
    expect(truncated.fontSize).toBe(14)
    expect(truncated.lines).toHaveLength(3)
    expect(truncated.lines[2].endsWith("…")).toBe(true)
  })
  it.each([1, 2, 5, 10])("fits %s winner cards within the image", (count) => {
    const grid = winnerGrid(count)
    expect(
      grid.columns * grid.width + (grid.columns - 1) * grid.gap
    ).toBeLessThanOrEqual(1072)
    expect(
      grid.rows * grid.height + (grid.rows - 1) * grid.gap
    ).toBeLessThanOrEqual(292)
    for (const text of [
      longHandle,
      "A very long display name with wide WWW letters",
      "山田太郎と世界の友達",
      "👩🏽‍💻👨‍👩‍👧‍👦 Café e\u0301",
    ]) {
      const fitted = fitOgText(text, {
        width: grid.width,
        maximumSize: 26,
        minimumSize: 14,
        maximumLines: 3,
      })
      expect(
        fitted.lines.every(
          (line) => estimateTextWidth(line, fitted.fontSize) <= grid.width
        )
      ).toBe(true)
      expect(fitted.lines.join("")).not.toContain("\uFFFD")
    }
  })
  it("does not split emoji or combining graphemes", () => {
    const text = "👨‍👩‍👧‍👦".repeat(5)
    const fitted = fitOgText(text, {
      width: 30,
      maximumSize: 20,
      minimumSize: 20,
      maximumLines: 5,
    })
    expect(fitted.lines).toEqual(Array(5).fill("👨‍👩‍👧‍👦"))
  })
})
