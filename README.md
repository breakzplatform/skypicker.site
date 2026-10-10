# SkyPicker

> Sorteios no Bluesky com OAuth e cota por usuário — disponível em **[skypicker.site](https://skypicker.site)** (EN) e **[sorteio.blue](https://sorteio.blue)** (PT-BR).

Aplicação Next.js que coleta os usuários que **curtiram** e/ou **repostaram** um post do Bluesky via [AT Protocol](https://atproto.com/) e sorteia ganhadores aleatoriamente. A autenticação é feita via **OAuth do AT Protocol** — cada visitante usa a própria cota de API, eliminando rate limits compartilhados.

---

## Recursos

- **OAuth Bluesky** — login com a própria conta. Sem App Password, sem credenciais em URL.
- **Cota por usuário** — cada visitante traz seu próprio orçamento de API; posts grandes não derrubam o app pra todo mundo.
- **Quatro modos de filtro**:
  - Likes **e** Reposts (interseção)
  - Likes **ou** Reposts (união, sem duplicatas)
  - Apenas Reposts
  - Apenas Likes
- **Quantos ganhadores você quiser** (1-1000) — todos os participantes são considerados pra justiça do sorteio, mas só os N escolhidos aparecem.
- **Paginação client-driven** — chamadas pequenas e enfileiradas pelo browser, com progresso real-time. Sem timeout de servidor.
- **Multi-domínio** — `skypicker.site` (en) e `sorteio.blue` (pt-br) servidos pelo mesmo deploy.
- **Sem rastreamento** — só um cookie de sessão OAuth assinado.

---

## Stack

| Camada                   | Tecnologia                                                                |
| ------------------------ | ------------------------------------------------------------------------- |
| Framework                | [Next.js 15](https://nextjs.org/) (App Router) · React 19 · TypeScript    |
| AT Protocol              | [`@atproto/api`](https://www.npmjs.com/package/@atproto/api) (Agent)      |
| OAuth                    | [`@atproto/oauth-client-node`](https://www.npmjs.com/package/@atproto/oauth-client-node) |
| Sessão                   | [`iron-session`](https://github.com/vvo/iron-session) (cookie cifrado)    |
| Estilo                   | [Tailwind CSS 3](https://tailwindcss.com/) + `tailwindcss-animate`        |
| Componentes              | [Radix UI](https://www.radix-ui.com/) primitives + shadcn/ui patterns     |
| Ícones                   | [Lucide](https://lucide.dev/)                                             |
| Tema                     | [`next-themes`](https://github.com/pacocoursey/next-themes)               |
| Roteamento de domínio    | Middleware do Next.js + [`psl`](https://www.npmjs.com/package/psl)        |
| Hospedagem               | Portátil — Vercel, Cloudflare Workers, Node self-host                     |

---

## Estrutura

```
app/
  layout.tsx                       Root layout (fontes, tema, viewport)
  [domain]/
    layout.tsx                     Layout específico do domínio
    page.tsx                       Server shell (resolve sessão, monta Raffle)
    raffle.tsx                     Client component (formulário, fetch, display)
  client-metadata.json/route.ts    Metadata pública do cliente OAuth
  api/
    oauth/
      login/route.ts               Inicia o fluxo OAuth
      callback/route.ts            Recebe code, troca por tokens
      logout/route.ts              Revoga sessão e limpa cookie
    at/
      post/route.ts                URL → AT URI (resolve handle pra DID)
      likes/route.ts               Página de likes (proxy autenticado)
      reposts/route.ts             Página de reposts (proxy autenticado)
      profiles/route.ts            Batch de perfis (até 25 DIDs)
components/
  ui/                              Primitivos (button, input, label, tabs)
  profile.tsx                      Card do perfil
  theme-provider.tsx               Provider next-themes
  tailwind-indicator.tsx           Helper dev
config/site.ts
data/content.json                  Strings localizadas por domínio
lib/
  atproto.ts                       getCurrentAgent / getCurrentDid
  oauth/
    client.ts                      NodeOAuthClient (cached)
    session.ts                     getOAuthCookie via iron-session
    stores.ts                      StateStore + SessionStore (cookie-backed)
  raffle.ts                        Orquestração client (collect, sample, profiles)
  utils.ts                         cn() + getDomain()
  fonts.ts                         Inter + JetBrains Mono
middleware.ts                      Reescrita por hostname
public/                            Favicons + OG images
styles/                            globals.css + custom.css
types/nav.ts
```

### Como funciona o sorteio

1. Visitante faz login OAuth (Bluesky) — cookie de sessão é gravado.
2. Cola URL do post + escolhe modo (likes/reposts/AND/OR) + número de ganhadores.
3. Cliente chama `/api/at/post` pra resolver a URL → AT URI.
4. Cliente enfileira chamadas paralelas a `/api/at/likes` e `/api/at/reposts`, paginando até `cursor === null`. Progresso aparece em tempo real.
5. Ao fim, cliente filtra (AND/OR/etc), embaralha, escolhe N DIDs.
6. Cliente chama `/api/at/profiles` em batches de 25 só pros N escolhidos.
7. UI mostra os ganhadores.

Cada chamada `/api/at/*` usa a sessão OAuth do cookie pra falar com o PDS do usuário — quota é per-user.

### Multi-domínio

`middleware.ts` lê o hostname, resolve domínio via `psl`, reescreve pra `/<domain>/...`. A rota dinâmica `app/[domain]/page.tsx` carrega `data/content.json[<domain>]` e renderiza com as strings corretas.

---

## Setup local

### Pré-requisitos

- **Node.js** 24.x (fixado em `engines.node`)
- **pnpm** 10+ (`corepack enable`)
- Uma conta Bluesky qualquer (não precisa App Password — OAuth resolve o login)

### Passos

```bash
git clone https://github.com/breakzplatform/skypicker.site.git
cd skypicker.site
cp .env.example .env
# Edite .env (veja seção abaixo)
pnpm install
pnpm dev
```

Abra `http://localhost:3000`. Pra testar cada domínio em dev, use **prefixo de path**:

- `http://localhost:3000/skypicker.site/` — copy em inglês
- `http://localhost:3000/sorteio.blue/` — copy em português
- `http://localhost:3000/` — default (`DEV_DOMAIN` env, fallback `skypicker.site`)

OAuth funciona local (formato loopback do AT Proto) com qualquer um deles. Sessão fica no cookie de `localhost`, então alternar entre os caminhos compartilha sessão. Em prod, cada domínio tem sessão isolada.

### Variáveis de ambiente

| Variável              | Obrigatória | Descrição                                                            |
| --------------------- | ----------- | -------------------------------------------------------------------- |
| `SESSION_SECRET`      | sim         | ≥32 chars. Cifragem do cookie de sessão. Gere com `openssl rand -base64 48`. |
| `LANDING_SUBDOMAIN`   | não         | Subdomínio tratado como root (ex.: `www`).                           |
| `SNAPSHOT_SECRET`     | não         | Chave HMAC dos links de snapshot. Cai no `SESSION_SECRET` se ausente. |
| `STAGING_HOSTS`       | não         | Hosts extras exatos → domínio (ex.: `skypicker-staging.vercel.app=skypicker.site`). |

> O origin (host + protocolo) é derivado do request — não há `PUBLIC_URL` fixa. Isso permite servir múltiplos domínios pelo mesmo deploy, cada um com seu próprio cliente OAuth.

### Scripts

```bash
pnpm dev            # servidor de desenvolvimento
pnpm build          # build de produção (requer PUBLIC_URL e SESSION_SECRET)
pnpm start          # serve o build
pnpm typecheck      # tsc --noEmit
pnpm lint           # next lint (deprecado no Next 16, ainda funciona)
pnpm format:write   # prettier --write
pnpm brand-assets   # regenera favicon, apple-touch-icon e OG da home a partir de lib/brand.ts
```

---

## Deploy

**Não é mais Vercel-only**. A arquitetura é portátil:

- **Sessão**: cookie cifrado (iron-session) — funciona em qualquer runtime Node/Edge.
- **Sem KV/Redis/DB**.
- **Paginação no cliente**: cada request HTTP do servidor é curto (<2s), evitando timeouts de plataformas serverless.

Funciona em Vercel, Cloudflare Workers, Fly.io, Render, AWS, Docker self-host, Railway etc. O `vercel.json` limita `maxDuration` a 60s (teto do plano Hobby); nenhuma rota faz trabalho ilimitado numa só chamada.

### Cliente OAuth (multi-domínio)

Cada domínio servido pelo deploy tem seu **próprio cliente OAuth**, derivado dinamicamente a partir do `host` do request. Em produção, **ambos** `https://skypicker.site/client-metadata.json` e `https://sorteio.blue/client-metadata.json` precisam estar acessíveis publicamente em HTTPS — o Authorization Server do Bluesky faz fetch nessas URLs pra validar cada cliente.

Sessões OAuth são per-domain (cookies são domain-scoped). Login em `skypicker.site` não vale em `sorteio.blue` — usuário loga em cada domínio que for usar.

Em desenvolvimento (host `localhost:*` ou `127.0.0.1:*`), o app usa o formato especial `http://localhost?redirect_uri=...&scope=atproto` previsto na spec do AT Proto OAuth — sem necessidade de hospedar metadata.

Pra testar 2 domínios localmente, aliase em `/etc/hosts` e use portas:

```
127.0.0.1 skypicker.local
127.0.0.1 sorteio.local
```

Cada um vira seu próprio "cliente" automaticamente.

### Staging

Aliases de staging entram via `STAGING_HOSTS` (só no target Preview da Vercel), sem afrouxar a allowlist. Cada alias vira seu próprio cliente OAuth, com `client-metadata.json` no próprio host.

### Marca

A cor do projeto é o magenta do DS joseli.to (`#D6008F`/branco no claro, `#EE6ABE`/preto no escuro), definida só em `lib/brand.ts`. O CSS recebe as variáveis pelo `app/layout.tsx`; OG e ícones importam direto.

---

## Limites práticos

Não há cap rígido em código, mas existem limites físicos:

- **Cota OAuth do visitante** ≈ 5000 req/5min. Com `limit=100` por página, isso dá ~500k participantes por sessão (250k se buscar likes+reposts em paralelo).
- **Latência de rede** × páginas. A 150ms/call, 1000 chamadas levam ~2.5min. UI mostra progresso e respeita `Retry-After` em 429.
- Posts gigantes podem precisar de uma pausa entre tentativas — o app não trava, só espera.

---

## Créditos

Feito de Pernambuco com carinho por **[Joselito](https://joseli.to)**.
Código-fonte em [github.com/breakzplatform](https://github.com/breakzplatform).
