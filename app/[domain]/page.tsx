import { X } from "lucide-react"

import { getAgent } from "@/lib/atproto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"

import content from "../../data/content.json"
import Head from "next/head"

export function generateMetadata({ params }: { params: { domain: string } }) {
  const domain = params.domain

  return {
    title: content[domain]?.meta?.title,
    description: content[domain]?.meta?.description,
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
  let error1: string | undefined

  let postParams: string | undefined
  let postUserHandle: string | undefined
  let postUserDid: string | undefined
  let postId: string | undefined

  let postLikes: any | undefined
  let postReposts: any | undefined
  let postCombined: any | undefined
  let postCombinedOr: any | undefined
  let postCombinedOrUniqueIds: any | undefined

  if (post) {
    if (post.startsWith('https://bsky.app/profile/')) {
      try {

        postParams = post.replace('https://bsky.app/profile/', '')
        postUserHandle = postParams.split("/")[0];
        postId = postParams.split("/")[2];

        const agent = await getAgent();

        const postUser = await agent.getProfile({
          actor: postUserHandle,
        });

        postUserDid = postUser.data?.did;

        postLikes = [];
        
        let postLikesData = await getAllLikes(agent, `at://${postUserDid}/app.bsky.feed.post/${postId}`, null, []);

        postLikesData.map(post => {
          postLikes.push(post.actor)
        });

        postReposts = await getAllReposts(agent, `at://${postUserDid}/app.bsky.feed.post/${postId}`, null, []);

        postCombined = postReposts.filter(item => postLikes.find(_ => _.did === item.did));

        postCombinedOr = postReposts.concat(postLikes);
        postCombinedOrUniqueIds = [];

        postCombinedOr = postCombinedOr.filter(element => {
          const isDuplicate = postCombinedOrUniqueIds.includes(element.did);
        
          if (!isDuplicate) {
            postCombinedOrUniqueIds.push(element.did);
        
            return true;
          }
        
          return false;
        });

      } catch (e) {
        console.error(e)
        error1 = (e as Error)?.message ?? "unknown error"
      }
    } else {
      error1 = content[domain]?.errors.error1
    }
  }

  return (
    <>
      <Head>
        <html lang={content[domain]?.meta?.lang} />
      </Head>
      <main className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
        <div className="mb-8">
          <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold sm:text-6xl md:text-8xl lg:text-9xl">{content[domain]?.title}</h1>
          <p className="mb-2 text-lg">{content[domain]?.subtitle}</p>
          <p className="text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: content[domain]?.description }}></p></div>
          <form>
            <div className="grid w-full items-center gap-1.5 lg:max-w-2xl">
              <div className="flex w-full items-center space-x-2 lg:max-w-2xl">
                <Input
                  type="text"
                  name="post"
                  placeholder="https://bsky.app/profile/sound3vision.bsky.social/post/3jzrqio5pxi27"
                  defaultValue={post}
                  required
                />
                <Button type="submit">{content[domain]?.form?.submit}</Button>
              </div>

              {error1 && (
                <p className="flex flex-row items-center gap-2 text-sm text-red-400">
                  <X className="h-4 w-4" /> {error1}
                </p>
              )}
            </div>
          </form>
        </div>
        <div className="gap-x-16 lg:flex lg:flex-row">
          {!!postCombined && <div className="basis-1/4">
            <h2 className="mb-2 text-2xl font-bold">{content[domain]?.results?.postCombined.title}</h2>
            <p>{postCombined.length} {content[domain]?.results?.postCombined.info}</p>

            {postCombined
              .sort((a: any, b: any) => 0.5 - Math.random())
              .map((profile: any, i: number) => {
                return <div className="relative" key={i+1}>
                <div className="absolute left-0 top-0 h-4 rounded bg-slate-100 px-1 text-center text-xs dark:bg-slate-800">
                {i+1}
              </div>
                <div>
                <a href={`https://bsky.app/profile/${profile.handle}`} target="_blank"><Profile profile={profile} className="mt-4" /></a>
                  </div>
              </div>
              })}
          </div>}
          {!!postCombinedOr && <div className="basis-1/4">
            <h2 className="mb-2 text-2xl font-bold">{content[domain]?.results?.postCombinedOr.title}</h2>
            <p>{postCombinedOr.length} {content[domain]?.results?.postCombinedOr.info}</p>

            {postCombinedOr
              .sort((a: any, b: any) => 0.5 - Math.random())
              .map((profile: any, i: number) => {
                return <div className="relative" key={i+1}>
                  <div className="absolute left-0 top-0 h-4 rounded bg-slate-100 px-1 text-center text-xs dark:bg-slate-800">
                  {i+1}
                </div>
                  <div>
                  <a href={`https://bsky.app/profile/${profile.handle}`} target="_blank"><Profile profile={profile} className="mt-4" /></a>
                    </div>
                </div>
              })}
          </div>}
          {!!postReposts && <div className="basis-1/4">
            <h2 className="mb-2 text-2xl font-bold">{content[domain]?.results?.postReposts.title}</h2>
            <p>{postReposts.length} {content[domain]?.results?.postReposts.info}</p>

            {postReposts
              .sort((a: any, b: any) => 0.5 - Math.random())
              .map((profile: any, i: number) => {
                return <div className="relative" key={i+1}>
                <div className="absolute left-0 top-0 h-4 rounded bg-slate-100 px-1 text-center text-xs dark:bg-slate-800">
                {i+1}
              </div>
                <div>
                <a href={`https://bsky.app/profile/${profile.handle}`} target="_blank"><Profile profile={profile} className="mt-4" /></a>
                  </div>
              </div>
              })}
          </div>}
          {!!postLikes && <div className="basis-1/4">
            <h2 className="mb-2 text-2xl font-bold">{content[domain]?.results?.postLikes.title}</h2>
            <p>{postLikes.length} {content[domain]?.results?.postLikes.info}</p>

            {postLikes
              .sort((a: any, b: any) => 0.5 - Math.random())
              .map((profile: any, i: number) => {
                return <div className="relative" key={i+1}>
                <div className="absolute left-0 top-0 h-4 rounded bg-slate-100 px-1 text-center text-xs dark:bg-slate-800">
                {i+1}
              </div>
                <div>
                <a href={`https://bsky.app/profile/${profile.handle}`} target="_blank"><Profile profile={profile} className="mt-4" /></a>
                  </div>
              </div>
              })}
          </div>}
        </div>
      </main>
      <footer className="container mb-8 grid items-center gap-2">
        <p className="text-xs" dangerouslySetInnerHTML={{ __html: content[domain]?.footer?.by }}></p>
        <p className="text-[0.7rem] text-gray-400">{content[domain]?.footer?.noCookies}</p>
        <a href="https://github.com/breakzplatform/skypicker.site" className="github-corner" aria-label={content[domain]?.footer?.ghFork}>
          <svg width="80" height="80" viewBox="0 0 250 250" style={{"fill":"#fff","color":"#151513","position":"absolute","top":"0","border":"0","right":"0"}} aria-hidden="true"><path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style={{"transformOrigin":"130px 106px"}} className="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" className="octo-body"></path></svg>
        </a>
      </footer>
    </>
  )
}
