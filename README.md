# SkyPicker

> Bluesky giveaways with AT Protocol OAuth and a per-user API quota, live at **[skypicker.site](https://skypicker.site)** (English) and **[sorteio.blue](https://sorteio.blue)** (Brazilian Portuguese).

A Next.js app that collects the accounts that **liked** and/or **reposted** a Bluesky post through the [AT Protocol](https://atproto.com/) and draws winners at random. Sign-in uses **AT Protocol OAuth**: every visitor spends their own API quota, so there is no shared rate limit.

---

## Features

- **Bluesky / Atmosphere OAuth**: sign in with your own account (on bsky.social or any other PDS). No app passwords, no credentials in URLs.
- **Per-user quota**: each visitor brings their own API budget; a huge post cannot take the app down for everyone.
- **Four filter modes**:
  - Likes **and** reposts (intersection)
  - Likes **or** reposts (union, no duplicates)
  - Reposts only
  - Likes only
- **Any number of winners** (1 to 1000). Every participant is in the pool; only the N winners are shown. Winners are drawn with a partial Fisher–Yates shuffle over `crypto.getRandomValues` (no modulo bias).
- **Shareable results**: a signed snapshot link (`/r/<snapshot>`) with its own OG image, for up to 100 winners.
- **Client-driven pagination**: small calls queued by the browser with live progress, so no server request runs long.
- **Two domains, one deploy**: `skypicker.site` (en) and `sorteio.blue` (pt-BR).
- **No tracking**: the only cookie is the encrypted OAuth session.

---

## Stack

| Layer          | Technology                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------- |
| Framework      | [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript                        |
| AT Protocol    | [`@atproto/api`](https://www.npmjs.com/package/@atproto/api) (`Agent`)                      |
| OAuth          | [`@atproto/oauth-client-node`](https://www.npmjs.com/package/@atproto/oauth-client-node), with [`@atproto-labs/fetch-node`](https://www.npmjs.com/package/@atproto-labs/fetch-node) SSRF protection |
| Session        | [`iron-session`](https://github.com/vvo/iron-session) (encrypted cookie)                    |
| Styles         | joseli.to design system tokens (`styles/ds/`, a verbatim copy) + `sp-*` components + Tailwind CSS 3 |
| Domain routing | Next.js middleware + [`psl`](https://www.npmjs.com/package/psl)                            |
| Tests          | [Vitest](https://vitest.dev/)                                                               |
| Hosting        | Portable: Vercel, or any Node host                                                          |

---

## Layout

```
app/
  layout.tsx                       Root layout (<html lang>, theme boot script, font preloads)
  [domain]/
    layout.tsx                     Per-domain layout
    page.tsx                       Server shell (reads the session, renders Raffle)
    raffle.tsx                     Client component (form, fetching, results)
  r/[snapshot]/
    page.tsx                       Shared result page (signed snapshot)
    og.png/route.ts                Result image (also offered as a download)
    opengraph-image.tsx            OG image for the result page
  client-metadata.json/route.ts    Public OAuth client metadata
  api/
    oauth/
      login/route.ts               Starts the OAuth flow
      callback/route.ts            Receives the code and exchanges it for tokens
      logout/route.ts              Revokes the session and clears the cookie (POST)
    at/
      post/route.ts                bsky.app URL -> at:// URI (resolves handle to DID)
      likes/route.ts               One page of likes (authenticated proxy)
      reposts/route.ts             One page of reposts (authenticated proxy)
      profiles/route.ts            Profile batch (up to 25 DIDs)
    snapshot/route.ts              Signs a result into a snapshot link (signed-in users only)
components/                        Site shell, sign-in, theme switch, wordmark
data/content.json                  Localized strings per domain
lib/
  atproto.ts                       getCurrentAgent / getCurrentDid
  at-proxy.ts                      Input validation and upstream error mapping for /api/at/*
  hosts.ts                         Known domains, staging aliases, Host allowlist
  oauth/
    client.ts                      NodeOAuthClient per origin (cached, SSRF-safe fetch)
    origin.ts                      Request origin from a validated Host header
    return-to.ts                   Same-origin return_to validation
    session.ts                     Session cookie via iron-session
    stores.ts                      State and session stores (cookie-backed)
  raffle.ts                        Client orchestration (collect, pool, draw, profiles)
  snapshot.ts                      Snapshot build, HMAC sign and verify
  site.ts                          Served domain and its content (en / pt-BR)
  theme.ts                         Manual themes (light / dark / terminal)
  og-image.tsx                     Home and result OG images (CMU fonts in assets/fonts)
  brand.ts                         Raw brand colours for images and icons
middleware.ts                      Host allowlist and per-domain rewrite
public/                            Favicons and home OG images
styles/                            globals.css, skypicker.css, ds/ (design system copy)
test/                              Vitest suites
```

### How a draw works

1. The visitor signs in with Bluesky or any Atmosphere account (handle or PDS address); an encrypted session cookie is set.
2. They paste a post URL and pick a mode (likes / reposts / and / or) and the number of winners.
3. The browser calls `/api/at/post` to turn the URL into an `at://` URI.
4. The browser pages through `/api/at/likes` and `/api/at/reposts` in parallel until `cursor` is `null`, showing progress. A `429` from upstream is passed through with `Retry-After`, and the browser waits and resumes.
5. The browser builds the pool for the chosen mode (deduplicated), then draws N DIDs.
6. It calls `/api/at/profiles` in batches of 25 for the winners only.
7. The winners are shown, and the host can create a signed snapshot link.

Every `/api/at/*` call uses the visitor's OAuth session to talk to their own PDS, so the quota is per user.

### Domains

`middleware.ts` rejects any Host that is not a known domain, a subdomain of one, a `STAGING_HOSTS` alias or a loopback address. It then rewrites the request to `/<domain>/...`, and `app/[domain]/page.tsx` renders `data/content.json[<domain>]`.

---

## Local setup

### Requirements

- **Node.js** 24.x (pinned in `engines.node`)
- **pnpm** 10+ (`corepack enable`)
- Any Bluesky account (OAuth handles sign-in; no app password needed)

### Steps

```bash
git clone https://github.com/breakzplatform/skypicker.site.git
cd skypicker.site
cp .env.example .env.local
# Fill in .env.local (see below)
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000` (use `127.0.0.1`, not `localhost`: the AT Protocol loopback client always redirects back to `127.0.0.1`, and the session cookie is per host). To try each domain in development, use a **path prefix**:

- `http://127.0.0.1:3000/skypicker.site/`: English copy
- `http://127.0.0.1:3000/sorteio.blue/`: Portuguese copy
- `http://127.0.0.1:3000/`: the default (`DEV_DOMAIN`, falling back to `skypicker.site`), or `?dev_domain=sorteio.blue`

OAuth works locally with the AT Protocol loopback client format, so no client metadata has to be hosted.

### Environment variables

Never commit real values. Generate each secret separately:

```bash
openssl rand -base64 32
```

| Variable            | Required | Description                                                                                                                                           |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`    | yes      | At least 32 characters. Encrypts the OAuth session cookie. Rotating it signs everyone out.                                                           |
| `SNAPSHOT_SECRET`   | no       | At least 32 characters. HMAC key for snapshot links; falls back to `SESSION_SECRET` when unset or empty. Rotating it invalidates every existing link. Recommended in production so the two can be rotated independently. |
| `STAGING_HOSTS`     | no       | Extra exact hostnames that serve a known domain, as `host=domain` pairs separated by commas, e.g. `my-app-staging.vercel.app=skypicker.site,my-app-pt-staging.vercel.app=sorteio.blue`. Entries naming an unknown domain are ignored. |
| `DEV_DOMAIN`        | no       | Domain rendered on loopback hosts (`skypicker.site` or `sorteio.blue`). Unknown values fall back to `skypicker.site`.                                 |
| `LANDING_SUBDOMAIN` | no       | Subdomain treated as the root (e.g. `www`).                                                                                                           |

For a build or a quick local check, the placeholder values in `.env.example` are enough (`set -a; . ./.env.example; set +a; pnpm build`).

> The origin (host and scheme) comes from the request, after the Host allowlist; there is no fixed public URL. That is what lets one deploy serve several domains, each with its own OAuth client. Off loopback the origin is always `https`.

### Snapshot security

Snapshot v2 signs the creator DID (`c`) from the authenticated server session,
never from request input. Decoding verifies the HMAC and validates the creator
DID. Legacy v1 links are intentionally rejected; these links existed only in
staging. Keep `SNAPSHOT_SECRET` private and stable to preserve v2 links.
The signature proves attribution and payload integrity, not that the submitted
winners were drawn fairly: the draw and winner list originate in the browser.

### Scripts

```bash
pnpm dev            # development server on 127.0.0.1:3000
pnpm build          # production build (needs SESSION_SECRET)
pnpm start          # serve the build
pnpm lint           # ESLint, fails on any warning
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest suites (pure logic, routes with mocked @atproto calls)
pnpm format:write   # prettier --write
pnpm brand-assets   # regenerate favicon, apple-touch-icon and home OG images from lib/brand.ts
```

---

## Deploy

The architecture is portable:

- **Session**: an encrypted cookie (iron-session), no server-side store.
- **No KV, Redis or database.**
- **Client-side pagination**: every server request is short, so serverless timeouts are not an issue.

`vercel.json` caps `maxDuration` at 60 s; no route does unbounded work in one call.

### Deploying to Netlify

`netlify.toml` runs `pnpm build` with Node 24, matching `engines.node`.
Use Netlify's automatically installed [OpenNext adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
Set these environment variables for builds and functions:

- `SESSION_SECRET`: a random secret of at least 32 characters.
- `SNAPSHOT_SECRET`: a separate random secret of at least 32 characters.
- `STAGING_HOSTS=staging.skypicker.site=skypicker.site,staging.sorteio.blue=sorteio.blue`

Both staging subdomains also resolve to their domain root without the explicit
aliases. Other subdomains retain the existing subdomain routing rules.
OAuth origins use the allowlisted `x-forwarded-host` when present, falling back
to the allowlisted `host`; forwarded headers are not required. Non-loopback
origins always use HTTPS. An untrusted forwarded host is rejected, not bypassed.

Middleware uses edge-compatible JavaScript (`psl`, with no Node filesystem or
crypto imports). Route handlers and server components use the default Node
runtime; snapshot/OG routes explicitly select `nodejs`. There are no Server
Actions in this app. Both snapshot image routes are covered by font file tracing
in `next.config.mjs`, so the OpenNext function can read `assets/fonts` at runtime.
After deploying, verify OAuth callbacks on both staging hosts and request both
`/r/<snapshot>/opengraph-image` and `/r/<snapshot>/og.png` to check the packaged
fonts. Site setup, DNS and deployment are managed separately.

### OAuth clients (one per domain)

Each domain the deploy serves gets **its own OAuth client**, derived from the request host. In production both `https://skypicker.site/client-metadata.json` and `https://sorteio.blue/client-metadata.json` must be publicly reachable over HTTPS; the authorization server fetches them to validate each client. The client name shown on the consent screen is the domain's brand (`SkyPicker` or `sorteio.blue`).

Sessions are per host: signing in on `skypicker.site` does not sign you in on `sorteio.blue`.

On loopback hosts (`127.0.0.1:*`, `localhost:*`, `[::1]:*`) the app uses the `http://localhost?redirect_uri=...&scope=...` client format from the AT Protocol OAuth spec, so nothing has to be hosted.

### Staging and previews

A preview deploy is only served when its hostname is listed in `STAGING_HOSTS` (set it on the Preview environment only); every other host gets `400 bad host`. Use a stable preview alias (for example the branch alias), not the per-commit URL. Each alias becomes its own OAuth client with `client-metadata.json` on that host, and renders the domain it is mapped to.

### Brand

The project colour is the joseli.to DS magenta (`#D6008F` on white in light, `#EE6ABE` on black in dark), defined only in `lib/brand.ts` for images and icons; pages use the DS tokens.

---

## Practical limits

There is no hard cap in code, but there are physical limits:

- **The visitor's OAuth quota**, about 5000 requests per 5 minutes. With `limit=100` per page that is roughly 500k participants per session (250k when fetching likes and reposts in parallel).
- **Network latency** times pages. At 150 ms per call, 1000 calls take about 2.5 minutes. The UI shows progress and honours `Retry-After` on 429.
- Very large posts may hit the rate limit; the app waits and resumes instead of failing.
- Snapshot links hold up to 100 winners.

---

## Credits

Made with love from Pernambuco by **[Joselito](https://joseli.to)**.
Source code at [github.com/breakzplatform](https://github.com/breakzplatform).
