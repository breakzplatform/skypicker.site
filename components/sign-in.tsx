"use client"

import { useId, useState } from "react"
import { usePathname } from "next/navigation"

import type { SiteContent } from "@/lib/site"

/**
 * Two equally weighted ways in: Bluesky's own server (bsky.social), or any
 * other Atmosphere (AT Protocol) account by handle or PDS address, which the
 * login route resolves to the right authorization server.
 */
export function SignIn({
  strings,
  error,
}: {
  strings: SiteContent["signin"]
  error?: React.ReactNode
}) {
  const [otherOpen, setOtherOpen] = useState(false)
  const pathname = usePathname()
  const returnTo = pathname || "/"
  const otherId = useId()

  return (
    <section className="panel cast">
      <h2 className="panel-h">{strings.title}</h2>
      <div className="panel-b sp-stack">
        <p>{strings.why}</p>
        <p className="sp-atmo">
          <strong>{strings.atmosphere}</strong>
        </p>
        <div className="sp-signin">
          <form action="/api/oauth/login" method="GET">
            <input type="hidden" name="return_to" value={returnTo} />
            <button type="submit" className="btn lg primary cast press">
              {strings.bluesky}
            </button>
          </form>
          <button
            type="button"
            aria-expanded={otherOpen}
            aria-controls={otherId}
            onClick={() => setOtherOpen((open) => !open)}
            className="btn lg cast press"
          >
            {strings.other}
          </button>
        </div>

        {otherOpen && (
          <form
            id={otherId}
            action="/api/oauth/login"
            method="GET"
            className="field-block m-0"
          >
            <input type="hidden" name="return_to" value={returnTo} />
            <label className="label" htmlFor={`${otherId}-handle`}>
              {strings.handleLabel}
            </label>
            <div className="input-row">
              <span className="field cast">
                <input
                  id={`${otherId}-handle`}
                  type="text"
                  name="handle"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={strings.handlePlaceholder}
                />
              </span>
              <button type="submit" className="btn primary cast press">
                {strings.continue}
              </button>
            </div>
            <span className="hint">{strings.handleHint}</span>
          </form>
        )}
        {error}
      </div>
    </section>
  )
}
