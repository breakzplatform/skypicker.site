import { AppBskyActorDefs } from "@atproto/api"
import { kv } from "@vercel/kv"
import { Check, X } from "lucide-react"

import { getAgent } from "@/lib/atproto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"
import { Stage } from "@/components/stage"

export function generateMetadata({ params }: { params: { domain: string } }) {
  const domain = params.domain
  return {
    title: `${domain}`,
    description: `'Faça sorteios de forma simples no Bluesky com o ${domain}`,
  }
}


async function getAllLikes(agent: any, uri: string, cursor: string | null | undefined, data: any = []) {
  let response: any;

  if (!!cursor) {
    response = await agent.getLikes({
      uri: uri,
      cursor: cursor
    });
  } else {
    response = await agent.getLikes({
      uri: uri
    });
  }

  data.push(...response.data?.likes);

  if (!!response.data.cursor) {
    return await getAllLikes(agent, uri, response.data.cursor, data);
  } else {
    return data
  }
}

async function getAllReposts(agent: any, uri: string, cursor: string | null | undefined, data: any = []) {
  let response: any;

  if (!!cursor) {
    response = await agent.getRepostedBy({
      uri: uri,
      cursor: cursor
    });
  } else {
    response = await agent.getRepostedBy({
      uri: uri
    });
  }

  data.push(...response.data?.repostedBy);

  if (!!response.data.cursor) {
    return await getAllReposts(agent, uri, response.data.cursor, data);
  } else {
    return data
  }
}
export default async function IndexPage({
  params,
  searchParams,
}: {
  params: {
    domain: string
  }
  searchParams: {
    post?: string
  }
}) {
  const domain = params.domain
  let post = searchParams.post
  let profile: AppBskyActorDefs.ProfileView | undefined
  let error1: string | undefined

  let postUserHandle: string | undefined
  let postUserDid: string | undefined
  let postId: string | undefined

  let postLikes: any | undefined
  let postReposts: any | undefined

  if (post) {
    if (post.startsWith('https://bsky.app/profile/')) {
      try {

        postUserHandle = (post.replace('https://bsky.app/profile/', '').split("/"))[0];
        postId = (post.replace('https://bsky.app/profile/', '').split("/"))[2];

        const agent = await getAgent();


        const postUser = await agent.getProfile({
          actor: postUserHandle,
        });

        postUserDid = postUser.data?.did;

        postLikes = await getAllLikes(agent, `at://${postUserDid}/app.bsky.feed.post/${postId}`, null, []);
        postReposts = await getAllReposts(agent, `at://${postUserDid}/app.bsky.feed.post/${postId}`, null, []);

      } catch (e) {
        console.error(e)
        error1 = (e as Error)?.message ?? "unknown error"
      }
    } else {
      error1 = "Por favor insira um link válido de um post do Bluesky"
    }
  }

  return (
    <>
      <main className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
        <div>
          <div className="mb-8">
          <h1 className="lg:text-9xl sm:text-6xl md:text-8xl text-4xl font-bold mb-4">{domain}</h1>
          <p className="text-lg mb-2">Faça um sorteio pelo Bluesky em segundos de forma simples.</p>
          <p className="text-sm text-gray-400">Informe a URL do post no campo abaixo e aperte em &quot;Randomizar&quot;. <strong>Os resultados já serão exibidos de forma aleatória</strong>.</p></div>
          <form>
            <div className="grid w-full lg:max-w-2xl items-center gap-1.5">
              <div className="flex w-full lg:max-w-2xl items-center space-x-2">
                <Input
                  type="text"
                  name="post"
                  placeholder="https://bsky.app/profile/sound3vision.bsky.social/post/3jzpa4tp7r32i"
                  defaultValue={post}
                  required
                />
                <Button type="submit">Randomizar</Button>
              </div>

              {error1 && (
                <p className="flex flex-row items-center gap-2 text-sm text-red-400">
                  <X className="h-4 w-4" /> {error1}
                </p>
              )}
            </div>
          </form>
        </div>
        <div className="lg:flex gap-x-16">
          {!!postReposts && <div>
            <h2 className="text-2xl font-bold mb-2">Reposts</h2>
            <p>{postReposts.length} repostaram este post</p>

            {postReposts
              .sort((a: any, b: any) => 0.5 - Math.random())
              .map((profile: any) => {
                return <>
                  <a href={`https://bsky.app/profile/${profile.handle}`} target="_blank"><Profile profile={profile} className="mt-4" /></a>
                </>
              })}
          </div>}
          {!!postLikes && <div>
            <h2 className="text-2xl font-bold mb-2">Likes</h2>
            <p>{postLikes.length} curtiram este post</p>

            {postLikes
              .sort((a: any, b: any) => 0.5 - Math.random())
              .map((post: any) => {
                return <>
                 <a href={`https://bsky.app/profile/${post.actor.handle}`} target="_blank"><Profile profile={post.actor} className="mt-4" /></a>
                </>
              })}
          </div>}
        </div>
      </main>
      <footer className="container grid items-center gap-2 mb-8">
        <p className="text-sm">Diretamente de Pernambuco por <a className="bold underline underline-offset-4" href="https://joseli.to">Joselito</a>, com muito amor e carinho.</p>
        <p className="text-xs text-gray-400">Este site não útiliza nenhum cookie nem coleta absolutamente nenhum dado.</p>
      </footer>
    </>
  )
}
