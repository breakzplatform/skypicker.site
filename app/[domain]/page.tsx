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
        <div className="gh-ribbon">
          <a href="https://github.com/breakzplatform/skypicker.site">{content[domain]?.footer?.ghFork}</a>
        </div>
      </footer>
    </>
  )
}
