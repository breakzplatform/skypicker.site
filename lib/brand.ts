/**
 * Single source of truth for the SkyPicker palette.
 *
 * The brand ink is magenta from the joseli.to design system (blue belongs to
 * notx.blue, amber to the terminal theme). The support chips use the DS
 * product inks (Pix, Sponsors) plus Buy Me a Coffee's own yellow. Every
 * ink/on-ink pairing below meets WCAG AA for normal text:
 *   brand    light #D6008F + white 4.93:1 · dark #EE6ABE + black 7.44:1
 *   pix      light #32BCAD + black 8.93:1 · dark #1A7A70 + white 5.17:1
 *   coffee   #FFDD00 + black 15.59:1 (both themes)
 *   sponsors light #FFB3D6 + black 12.67:1 · dark #FF9CCB + black 10.87:1
 * Brand ink as text: #D6008F on the light page 4.53:1, #EE6ABE on night 5.40:1.
 *
 * CSS gets these values as variables from app/layout.tsx; OG images and the
 * icon generator import them directly.
 */
type Ink = { ink: string; onInk: string }
type ThemedInk = { light: Ink; dark: Ink }

const coffee: Ink = { ink: "#FFDD00", onInk: "#000000" }

export const inks = {
  brand: {
    light: { ink: "#D6008F", onInk: "#FFFFFF" },
    dark: { ink: "#EE6ABE", onInk: "#000000" },
  },
  pix: {
    light: { ink: "#32BCAD", onInk: "#000000" },
    dark: { ink: "#1A7A70", onInk: "#FFFFFF" },
  },
  coffee: { light: coffee, dark: coffee },
  sponsors: {
    light: { ink: "#FFB3D6", onInk: "#000000" },
    dark: { ink: "#FF9CCB", onInk: "#000000" },
  },
} as const satisfies Record<string, ThemedInk>

export const brand = {
  ...inks.brand,
  night: "#102642",
  cream: "#FEF3E2",
} as const

function rgbChannels(hex: string): string {
  const value = hex.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)).join(" ")
}

function variables(theme: "light" | "dark"): string {
  return Object.entries(inks)
    .map(
      ([name, themed]) =>
        `--${name}:${rgbChannels(themed[theme].ink)};--${name}-foreground:${rgbChannels(themed[theme].onInk)}`
    )
    .join(";")
}

export const brandCssVariables = `:root{${variables("light")}}.dark{${variables("dark")}}`
