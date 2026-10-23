import { getCurrentAgent, getCurrentDid } from "@/lib/atproto"
import { isKnownDomain } from "@/lib/hosts"
import { getOriginFromHeaders } from "@/lib/oauth/origin"
import { siteContent } from "@/lib/site"
import { SiteFooter, TopBar } from "@/components/site-shell"
import { Wordmark } from "@/components/wordmark"

import { Raffle } from "./raffle"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  if (!isKnownDomain(domain)) return {}
  const c = siteContent(domain)

  return {
    title: c.meta.title,
    description: c.meta.description,
    metadataBase: new URL(await getOriginFromHeaders()),
    openGraph: {
      images: `/og-${domain}.png`,
    },
  }
}

async function sessionHandle(did: string): Promise<string | null> {
  try {
    const agent = await getCurrentAgent()
    if (!agent) return null
    const profile = await agent.app.bsky.actor.getProfile({ actor: did })
    return profile.data.handle
  } catch {
    return null
  }
}

export default async function IndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ oauth_error?: string }>
}) {
  const { domain } = await params
  const sp = await searchParams
  if (!isKnownDomain(domain)) return null
  const c = siteContent(domain)

  const sessionDid = await getCurrentDid()
  const handle = sessionDid ? await sessionHandle(sessionDid) : null

  return (
    <div className="sp-page">
      <TopBar content={c} />
      <main>
        <header className="sp-masthead">
          <Wordmark content={c} />
        </header>

        <Raffle
          sessionDid={sessionDid}
          sessionHandle={handle}
          strings={{ ...c.raffle, signin: c.signin, intro: c.intro }}
          locale={c.meta.locale}
          initialError={sp.oauth_error}
        />
      </main>
      <SiteFooter content={c} />
    </div>
  )
}
