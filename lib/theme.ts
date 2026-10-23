export const THEMES = ["light", "dark", "terminal"] as const

export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = "theme"

/**
 * Inlined in <head> before first paint (the DS theme/boot.js). The theme is
 * manual: light unless this device picked dark or terminal; never
 * prefers-color-scheme. Storage can throw (private mode), so light is the
 * fallback.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="terminal")document.documentElement.setAttribute("data-theme",t)}catch(e){}`

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
}
