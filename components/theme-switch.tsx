"use client"

import { useEffect, useState } from "react"

import {
  isTheme,
  nextTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme"

export type ThemeSwitchStrings = {
  names: Record<Theme, string>
  /** Accessible name, e.g. "Theme: {current}, tap for {next}". */
  label: string
}

function currentTheme(): Theme {
  const value = document.documentElement.getAttribute("data-theme")
  return isTheme(value) ? value : "light"
}

function applyTheme(theme: Theme, persist: boolean) {
  const root = document.documentElement
  if (theme === "light") root.removeAttribute("data-theme")
  else root.setAttribute("data-theme", theme)
  if (!persist) return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage unavailable: the choice lasts for this page view only.
  }
}

/**
 * The DS theme control: one button cycling light -> dark -> terminal. Like a
 * language toggle, its label and icon name the NEXT theme.
 */
export function ThemeSwitch({ strings }: { strings: ThemeSwitchStrings }) {
  // The server renders the light page's button; the boot script may already
  // have applied another theme, which the effect picks up after hydration.
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    setTheme(currentTheme())
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return
      const theme = isTheme(event.newValue) ? event.newValue : "light"
      applyTheme(theme, false)
      setTheme(theme)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const next = nextTheme(theme)

  function onClick() {
    applyTheme(next, true)
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-next-theme={next}
      aria-label={strings.label
        .replace("{current}", strings.names[theme])
        .replace("{next}", strings.names[next])}
      className="btn sm cast press theme-switch"
    >
      <svg
        className="icon icon-sun"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg
        className="icon icon-moon"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
      >
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
      </svg>
      <svg
        className="icon icon-terminal"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
      >
        <path d="M12 19h8" />
        <path d="m4 17 6-6-6-6" />
      </svg>
      <span>{strings.names[next]}</span>
    </button>
  )
}
