import Head from "next/head"
import { X } from "lucide-react"

import { getAgent, getAgentParams } from "@/lib/atproto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Profile } from "@/components/profile"

import content from "../../data/content.json"

export function generateMetadata({ params }: { params: { domain: string } }) {
  const domain = params.domain

  return {
    title: content[domain]?.meta?.title,
    description: content[domain]?.meta?.description,
    openGraph: {
      images: `https://${params.domain}/og-${params.domain}.png`,
    },
  }
}

async function getAllLikes(
  agent: any,
  uri: string,
  cursor: string | null | undefined,
  data: any = []
) {
  let response: any

  if (!!cursor) {
    response = await agent.getLikes({
      uri: uri,
      cursor: cursor,
    })
  } else {
    response = await agent.getLikes({
      uri: uri,
    })
  }

  data.push(...response.data?.likes)

  if (!!response.data.cursor) {
    return await getAllLikes(agent, uri, response.data.cursor, data)
  } else {
    return data
  }
}

async function getAllReposts(
  agent: any,
  uri: string,
  cursor: string | null | undefined,
  data: any = []
) {
  let response: any

  if (!!cursor) {
    response = await agent.getRepostedBy({
      uri: uri,
      cursor: cursor,
    })
  } else {
    response = await agent.getRepostedBy({
      uri: uri,
    })
  }

  data.push(...response.data?.repostedBy)

  if (!!response.data.cursor) {
    return await getAllReposts(agent, uri, response.data.cursor, data)
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
    user?: string
    pass?: string
  }
}) {
  const domain = params.domain
  let post = searchParams.post
  let user = searchParams.user
  let pass = searchParams.pass
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
    if (post.startsWith("https://bsky.app/profile/")) {
      try {
        postParams = post.replace("https://bsky.app/profile/", "")
        postUserHandle = postParams.split("/")[0]
        postId = postParams.split("/")[2]

        let agent

        if (!!searchParams?.user && !!searchParams?.pass) {
          agent = await getAgentParams(searchParams.user, searchParams.pass)
        } else {
          agent = await getAgent()
        }

        const postUser = await agent.getProfile({
          actor: postUserHandle,
        })

        postUserDid = postUser.data?.did

        postLikes = []

        let postLikesData = await getAllLikes(
          agent,
          `at://${postUserDid}/app.bsky.feed.post/${postId}`,
          null,
          []
        )

        postLikesData.map((post) => {
          postLikes.push(post.actor)
        })

        postReposts = await getAllReposts(
          agent,
          `at://${postUserDid}/app.bsky.feed.post/${postId}`,
          null,
          []
        )

        postCombined = postReposts.filter((item) =>
          postLikes.find((_) => _.did === item.did)
        )

        postCombinedOr = postReposts.concat(postLikes)
        postCombinedOrUniqueIds = []

        postCombinedOr = postCombinedOr.filter((element) => {
          const isDuplicate = postCombinedOrUniqueIds.includes(element.did)

          if (!isDuplicate) {
            postCombinedOrUniqueIds.push(element.did)

            return true
          }

          return false
        })
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
      <main className="container grid gap-6 items-center pt-6 pb-8 md:py-10">
        <div className="mb-8">
          <div className="mb-8">
            {content[domain]?.title === "sorteio.blue" ? (
              <>
                <svg
                  className="mb-6 max-w-2xl text-[#208BFE] dark:text-[#FEF3E2]"
                  viewBox="0 0 1230 164"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M47.5586 162.61C39.6159 162.61 32.487 161.926 26.1719 160.559C19.9219 159.192 14.9414 157.402 11.2305 155.188C7.58464 152.974 4.78516 150.598 2.83203 148.059C0.94401 145.52 0 142.981 0 140.442C0 136.926 1.30208 133.899 3.90625 131.36C6.51042 128.756 9.60286 127.454 13.1836 127.454C15.6576 127.454 17.8385 128.105 19.7266 129.407C21.6797 130.644 24.2188 132.987 27.3438 136.438C35.8073 145.487 44.1406 150.012 52.3438 150.012C54.8828 150.012 57.1615 149.426 59.1797 148.254C61.1979 147.017 62.207 145.455 62.207 143.567C62.207 141.679 61.5885 140.019 60.3516 138.586C59.1797 137.154 57.3568 135.885 54.8828 134.778C52.474 133.606 50.0651 132.629 47.6562 131.848C45.2474 131.002 42.1875 129.993 38.4766 128.821C34.8307 127.649 31.8034 126.575 29.3945 125.598C19.4987 121.562 12.1094 116.581 7.22656 110.657C2.40885 104.732 0 98.1242 0 90.8325C0 78.8534 4.81771 69.0226 14.4531 61.3403C24.1536 53.658 36.4583 49.8169 51.3672 49.8169C62.6302 49.8169 71.9076 52.063 79.1992 56.5552C86.4909 60.9823 90.1367 66.1255 90.1367 71.9849C90.1367 74.7192 89.0299 77.0955 86.8164 79.1138C84.668 81.0669 81.9336 82.0435 78.6133 82.0435C75.293 82.0435 72.2331 81.2622 69.4336 79.6997C66.6992 78.1372 63.737 75.7609 60.5469 72.5708C60.3516 72.3755 59.6029 71.6919 58.3008 70.52C57.0638 69.3481 56.1849 68.5669 55.6641 68.1763C55.2083 67.7205 54.3294 67.0369 53.0273 66.1255C51.7904 65.1489 50.7161 64.4653 49.8047 64.0747C48.9583 63.6841 47.8516 63.326 46.4844 63.0005C45.1823 62.6099 43.8802 62.4146 42.5781 62.4146C38.9323 62.4146 36.0026 63.326 33.7891 65.1489C31.6406 66.9718 30.5664 68.8599 30.5664 70.813C30.5664 72.2453 30.8594 73.4497 31.4453 74.4263C32.0964 75.3377 33.3659 76.2166 35.2539 77.063C37.1419 77.9093 39.0299 78.6255 40.918 79.2114C42.806 79.7323 45.8333 80.6112 50 81.8481C54.2318 83.0851 58.1706 84.3221 61.8164 85.5591C72.4284 89.1398 80.4362 94.1203 85.8398 100.5C91.2435 106.816 93.9453 114.172 93.9453 122.571C93.9453 133.378 89.3555 142.753 80.1758 150.696C71.0612 158.639 60.1888 162.61 47.5586 162.61Z"
                    fill="currentColor"
                  />
                  <path
                    d="M156.543 162.805C145.605 162.805 135.71 160.396 126.855 155.579C118.066 150.696 111.198 144.023 106.25 135.559C101.302 127.03 98.8281 117.525 98.8281 107.043C98.8281 95.9757 101.367 86.1125 106.445 77.4536C111.589 68.7948 118.62 62.1216 127.539 57.4341C136.523 52.7466 146.68 50.4028 158.008 50.4028C168.88 50.4028 178.678 52.8442 187.402 57.7271C196.191 62.6099 203.027 69.3156 207.91 77.8442C212.793 86.3078 215.234 95.7479 215.234 106.165C215.234 123.027 209.733 136.698 198.73 147.18C187.728 157.597 173.665 162.805 156.543 162.805ZM143.945 74.4263C143.945 80.7414 144.401 88.1307 145.312 96.5942C146.289 104.993 147.591 113.293 149.219 121.497C150.846 129.7 152.995 136.633 155.664 142.297C158.333 147.961 161.165 150.793 164.16 150.793C167.936 150.793 169.824 147.343 169.824 140.442C169.824 133.866 169.368 126.282 168.457 117.688C167.546 109.029 166.276 100.533 164.648 92.1997C163.021 83.8013 160.872 76.7375 158.203 71.0083C155.599 65.2791 152.799 62.4146 149.805 62.4146C145.898 62.4146 143.945 66.4185 143.945 74.4263Z"
                    fill="currentColor"
                  />
                  <path
                    d="M237.5 158.606C230.99 158.606 226.66 158.215 224.512 157.434C222.363 156.653 221.289 155.123 221.289 152.844C221.289 151.607 221.517 150.663 221.973 150.012C222.428 149.296 223.34 148.612 224.707 147.961C226.79 146.855 228.158 145.748 228.809 144.641C229.525 143.469 229.883 141.777 229.883 139.563V87.2192C229.883 84.6151 229.46 82.8573 228.613 81.9458C227.832 81.0343 226.465 80.5786 224.512 80.5786C222.754 80.5786 221.452 80.2856 220.605 79.6997C219.824 79.0487 219.434 77.9419 219.434 76.3794C219.434 73.9705 220.931 71.6919 223.926 69.5435C226.921 67.3299 233.561 63.3911 243.848 57.7271C246.452 56.2948 248.47 55.188 249.902 54.4067C252.116 53.1698 254.102 52.2257 255.859 51.5747C257.682 50.8586 259.245 50.4028 260.547 50.2075C261.914 49.9471 263.118 50.0122 264.16 50.4028C265.267 50.7935 266.178 51.2817 266.895 51.8677C267.611 52.3885 268.327 53.3 269.043 54.6021C269.759 55.839 270.345 57.0435 270.801 58.2153C271.257 59.3221 271.81 60.8521 272.461 62.8052L275.488 71.3989C278.418 64.9536 282.064 59.7453 286.426 55.7739C290.853 51.8026 295.671 49.8169 300.879 49.8169C308.236 49.8169 313.932 52.356 317.969 57.4341C322.005 62.5122 323.958 68.8924 323.828 76.5747C323.828 83.3455 322.135 88.7166 318.75 92.688C315.43 96.6593 310.872 98.645 305.078 98.645C301.302 98.645 298.112 97.7661 295.508 96.0083C292.969 94.1854 290.69 91.2557 288.672 87.2192C287.044 83.964 285.742 81.8156 284.766 80.7739C283.854 79.7323 282.487 79.2114 280.664 79.2114C279.883 79.2114 279.232 79.3416 278.711 79.6021L279.102 140.637C279.102 143.437 279.688 145.357 280.859 146.399C282.031 147.375 284.115 148.189 287.109 148.84C289.779 149.361 291.113 150.566 291.113 152.454C291.113 154.928 290.299 156.588 288.672 157.434C287.044 158.215 283.724 158.606 278.711 158.606H237.5Z"
                    fill="currentColor"
                  />
                  <path
                    d="M377.148 163C364.258 163 354.329 160.234 347.363 154.7C340.397 149.166 336.914 141.679 336.914 132.239V70.0317H331.738C326.66 70.0317 324.121 68.4367 324.121 65.2466C324.121 63.4888 325 62.089 326.758 61.0474C328.581 59.9406 330.827 59.1268 333.496 58.606C336.165 58.02 339.779 56.9132 344.336 55.2856C348.893 53.5929 353.223 51.5096 357.324 49.0356C362.012 46.2362 366.048 43.3716 369.434 40.4419C372.884 37.4471 375.26 35.0708 376.562 33.313C377.93 31.4901 379.232 30.0252 380.469 28.9185C381.771 27.7466 383.04 27.1606 384.277 27.1606C385.905 27.1606 387.012 27.6489 387.598 28.6255C388.249 29.5369 388.574 31.132 388.574 33.4106V54.7974L408.301 54.4067C410.645 54.4067 412.207 54.7323 412.988 55.3833C413.77 55.9692 414.16 57.369 414.16 59.5825C414.16 61.8612 413.965 63.5864 413.574 64.7583C413.249 65.9302 412.402 66.9718 411.035 67.8833C409.668 68.7297 407.682 69.3156 405.078 69.6411C402.539 69.9015 398.958 70.0317 394.336 70.0317H388.574V130.774C388.574 133.378 389.421 135.364 391.113 136.731C392.871 138.098 395.28 138.782 398.34 138.782C400.944 138.782 404.688 137.87 409.57 136.047C411.914 135.266 413.509 135.722 414.355 137.415C415.332 139.889 413.249 143.697 408.105 148.84C404.069 153.072 399.154 156.49 393.359 159.094C387.565 161.698 382.161 163 377.148 163Z"
                    fill="currentColor"
                  />
                  <path
                    d="M475.195 163.196C466.992 163.196 459.212 161.666 451.855 158.606C444.564 155.546 438.379 151.51 433.301 146.497C428.288 141.418 424.316 135.592 421.387 129.016C418.457 122.441 416.992 115.702 416.992 108.801C416.992 97.1476 419.596 86.8937 424.805 78.0396C430.078 69.1203 437.174 62.3494 446.094 57.7271C455.013 53.1047 465.039 50.7935 476.172 50.7935C488.867 50.7935 499.251 54.0161 507.324 60.4614C515.462 66.8416 520.736 76.0864 523.145 88.1958C523.861 91.7765 523.828 94.4458 523.047 96.2036C522.266 97.8963 520.443 99.231 517.578 100.208C511.914 102.226 503.776 104.179 493.164 106.067C482.552 107.89 472.07 109.192 461.719 109.973C463.151 119.088 465.983 125.468 470.215 129.114C474.447 132.76 481.087 134.583 490.137 134.583C498.6 134.583 506.152 132.922 512.793 129.602C517.22 127.519 519.889 127.649 520.801 129.993C521.452 131.881 520.247 134.875 517.188 138.977C506.445 155.123 492.448 163.196 475.195 163.196ZM460.352 82.4341C460.352 88.6841 460.417 93.1437 460.547 95.813C464.453 95.6177 468.197 95.2271 471.777 94.6411C475.488 94.1203 477.734 93.3065 478.516 92.1997C479.362 91.0929 479.785 88.8794 479.785 85.5591C479.785 78.4627 478.809 72.8963 476.855 68.8599C474.967 64.8234 472.331 62.8052 468.945 62.8052C466.276 62.8052 464.16 64.563 462.598 68.0786C461.1 71.5942 460.352 76.3794 460.352 82.4341Z"
                    fill="currentColor"
                  />
                  <path
                    d="M546.68 158.606C540.169 158.606 535.84 158.215 533.691 157.434C531.543 156.653 530.469 155.123 530.469 152.844C530.469 151.607 530.697 150.663 531.152 150.012C531.608 149.296 532.52 148.612 533.887 147.961C535.97 146.855 537.337 145.748 537.988 144.641C538.704 143.469 539.062 141.777 539.062 139.563L538.867 89.1724C538.867 84.6802 538.444 81.8481 537.598 80.6763C536.816 79.4393 535.059 78.8208 532.324 78.8208C530.892 78.8208 529.883 78.4953 529.297 77.8442C528.776 77.1932 528.516 76.119 528.516 74.6216C528.516 71.4966 530.273 69.0552 533.789 67.2974C537.305 65.4744 545.996 62.3169 559.863 57.8247C562.207 57.0435 564.681 56.1971 567.285 55.2856C569.889 54.3091 571.81 53.5929 573.047 53.1372C574.349 52.6815 575.684 52.2257 577.051 51.77C578.418 51.3143 579.525 51.0213 580.371 50.8911C581.217 50.6958 581.999 50.5981 582.715 50.5981C583.952 50.5981 584.928 50.7284 585.645 50.9888C586.426 51.2492 587.012 51.5096 587.402 51.77C587.858 52.0304 588.151 52.6815 588.281 53.7231C588.477 54.6997 588.574 55.5135 588.574 56.1646C588.639 56.7505 588.672 57.9549 588.672 59.7778C588.672 68.1763 588.607 81.6854 588.477 100.305C588.346 118.86 588.281 132.174 588.281 140.247C588.281 142.851 588.639 144.706 589.355 145.813C590.137 146.855 591.504 147.668 593.457 148.254C595.605 148.84 596.68 150.24 596.68 152.454C596.68 154.928 595.866 156.588 594.238 157.434C592.611 158.215 589.29 158.606 584.277 158.606H546.68ZM536.914 23.8403C537.109 16.6789 539.616 10.8846 544.434 6.45752C549.251 1.96533 555.339 -0.183105 562.695 0.012207C570.964 0.20752 577.669 2.90934 582.812 8.11768C588.021 13.2609 590.527 19.7713 590.332 27.6489C590.137 34.4198 587.467 39.9211 582.324 44.1528C577.181 48.3846 570.703 50.4028 562.891 50.2075C555.078 50.0122 548.73 47.4731 543.848 42.5903C539.03 37.6424 536.719 31.3924 536.914 23.8403Z"
                    fill="currentColor"
                  />
                  <path
                    d="M660.449 162.805C649.512 162.805 639.616 160.396 630.762 155.579C621.973 150.696 615.104 144.023 610.156 135.559C605.208 127.03 602.734 117.525 602.734 107.043C602.734 95.9757 605.273 86.1125 610.352 77.4536C615.495 68.7948 622.526 62.1216 631.445 57.4341C640.43 52.7466 650.586 50.4028 661.914 50.4028C672.786 50.4028 682.585 52.8442 691.309 57.7271C700.098 62.6099 706.934 69.3156 711.816 77.8442C716.699 86.3078 719.141 95.7479 719.141 106.165C719.141 123.027 713.639 136.698 702.637 147.18C691.634 157.597 677.572 162.805 660.449 162.805ZM647.852 74.4263C647.852 80.7414 648.307 88.1307 649.219 96.5942C650.195 104.993 651.497 113.293 653.125 121.497C654.753 129.7 656.901 136.633 659.57 142.297C662.24 147.961 665.072 150.793 668.066 150.793C671.842 150.793 673.73 147.343 673.73 140.442C673.73 133.866 673.275 126.282 672.363 117.688C671.452 109.029 670.182 100.533 668.555 92.1997C666.927 83.8013 664.779 76.7375 662.109 71.0083C659.505 65.2791 656.706 62.4146 653.711 62.4146C649.805 62.4146 647.852 66.4185 647.852 74.4263Z"
                    fill="currentColor"
                  />
                  <path
                    d="M751.172 162.415C743.555 162.415 737.077 159.875 731.738 154.797C726.4 149.654 723.73 142.851 723.73 134.387C723.73 124.622 726.595 116.744 732.324 110.754C738.118 104.765 745.345 101.77 754.004 101.77C761.621 101.77 767.969 104.309 773.047 109.387C778.19 114.4 780.762 121.269 780.762 129.993C780.762 139.433 778.027 147.213 772.559 153.333C767.155 159.387 760.026 162.415 751.172 162.415Z"
                    fill="currentColor"
                  />
                  <path
                    d="M849.902 162.415C847.689 162.415 844.792 162.024 841.211 161.243C837.695 160.527 834.44 159.81 831.445 159.094C828.516 158.443 824.772 158.053 820.215 157.922C815.658 157.792 811.23 158.346 806.934 159.583C803.483 160.494 800.814 161.08 798.926 161.34C797.103 161.601 795.736 161.373 794.824 160.657C793.978 160.006 793.49 159.257 793.359 158.411C793.229 157.564 793.164 156.034 793.164 153.821V53.0396C793.164 51.2166 793.132 49.8494 793.066 48.938C793.001 48.0265 792.806 47.0174 792.48 45.9106C792.155 44.7388 791.667 43.925 791.016 43.4692C790.365 42.9484 789.421 42.5252 788.184 42.1997C786.947 41.8091 785.384 41.6138 783.496 41.6138C781.868 41.6138 780.697 41.3859 779.98 40.9302C779.264 40.4744 778.906 39.563 778.906 38.1958C778.906 35.201 780.99 32.6945 785.156 30.6763C789.323 28.5929 798.568 25.0773 812.891 20.1294C814.648 19.5435 815.983 19.0877 816.895 18.7622C827.116 15.3117 834.049 13.5864 837.695 13.5864C840.039 13.5864 841.602 14.2049 842.383 15.4419C843.164 16.6789 843.555 18.8599 843.555 21.9849L842.871 67.1997C846.582 61.731 850.977 57.4666 856.055 54.4067C861.133 51.3468 866.276 49.8169 871.484 49.8169C883.203 49.8169 892.578 54.4067 899.609 63.5864C906.641 72.701 910.156 85.1034 910.156 100.793C910.156 109.648 908.626 117.916 905.566 125.598C902.507 133.28 898.307 139.823 892.969 145.227C887.695 150.566 881.315 154.765 873.828 157.825C866.406 160.885 858.431 162.415 849.902 162.415ZM842.48 149.426C845.866 150.077 848.275 150.403 849.707 150.403C854.329 150.403 857.552 148.808 859.375 145.618C861.198 142.362 862.109 136.698 862.109 128.625C862.109 112.154 860.514 99.1984 857.324 89.7583C854.134 80.3182 849.74 75.5981 844.141 75.5981H842.676L842.48 86.8286V149.426Z"
                    fill="currentColor"
                  />
                  <path
                    d="M934.961 158.606C928.451 158.606 924.121 158.215 921.973 157.434C919.824 156.653 918.75 155.123 918.75 152.844C918.75 151.607 918.978 150.663 919.434 150.012C919.889 149.296 920.801 148.612 922.168 147.961C924.251 146.855 925.651 145.748 926.367 144.641C927.083 143.469 927.441 141.777 927.441 139.563L926.758 53.8208C926.758 49.1984 926.27 46.106 925.293 44.5435C924.382 42.981 922.493 42.1997 919.629 42.1997C917.806 42.1997 916.536 41.9393 915.82 41.4185C915.104 40.8325 914.746 39.8885 914.746 38.5864C914.746 35.8521 916.048 33.7036 918.652 32.1411C921.322 30.5786 927.832 27.8117 938.184 23.8403C942.285 22.2778 945.54 21.0083 947.949 20.0317C950.228 19.1854 952.702 18.2739 955.371 17.2974C958.04 16.3208 959.993 15.6047 961.23 15.1489C962.467 14.6932 963.77 14.2375 965.137 13.7817C966.504 13.326 967.611 13.033 968.457 12.9028C969.303 12.7075 970.085 12.6099 970.801 12.6099C972.038 12.6099 973.014 12.7401 973.73 13.0005C974.512 13.2609 975.098 13.5213 975.488 13.7817C975.944 14.0422 976.237 14.6932 976.367 15.7349C976.562 16.7114 976.66 17.5252 976.66 18.1763C976.725 18.7622 976.758 19.9666 976.758 21.7896C976.172 31.3599 975.846 42.6554 975.781 55.6763C975.781 68.632 975.911 83.8338 976.172 101.282C976.432 118.665 976.562 131.653 976.562 140.247C976.562 142.851 976.921 144.706 977.637 145.813C978.418 146.855 979.818 147.668 981.836 148.254C983.919 148.775 984.961 150.175 984.961 152.454C984.961 154.928 984.147 156.588 982.52 157.434C980.892 158.215 977.572 158.606 972.559 158.606H934.961Z"
                    fill="currentColor"
                  />
                  <path
                    d="M1032.23 163C1027.47 163 1022.98 162.252 1018.75 160.754C1014.52 159.322 1010.64 157.141 1007.13 154.211C1003.61 151.217 1000.81 147.18 998.73 142.102C996.712 137.024 995.736 131.197 995.801 124.622L995.996 89.1724C995.996 84.6802 995.605 81.8481 994.824 80.6763C994.043 79.4393 992.448 78.8208 990.039 78.8208C988.607 78.8208 987.598 78.4953 987.012 77.8442C986.491 77.1932 986.23 76.119 986.23 74.6216C986.23 71.4966 987.956 69.0552 991.406 67.2974C994.857 65.5396 1003.39 62.382 1016.99 57.8247C1019.34 57.0435 1021.81 56.1971 1024.41 55.2856C1027.02 54.3091 1028.94 53.5929 1030.18 53.1372C1031.48 52.6815 1032.81 52.2257 1034.18 51.77C1035.55 51.3143 1036.65 51.0213 1037.5 50.8911C1038.35 50.6958 1039.13 50.5981 1039.84 50.5981C1041.08 50.5981 1042.06 50.7284 1042.77 50.9888C1043.55 51.2492 1044.14 51.5096 1044.53 51.77C1044.99 52.0304 1045.28 52.6815 1045.41 53.7231C1045.61 54.6997 1045.7 55.5135 1045.7 56.1646C1045.77 56.7505 1045.8 57.9549 1045.8 59.7778L1045.41 129.797C1045.41 133.573 1046.19 136.373 1047.75 138.196C1049.32 139.954 1051.82 140.833 1055.27 140.833C1056.97 140.833 1058.69 140.279 1060.45 139.172L1062.21 89.1724C1062.21 84.6802 1061.78 81.8481 1060.94 80.6763C1060.16 79.4393 1058.4 78.8208 1055.66 78.8208C1054.23 78.8208 1053.22 78.4953 1052.64 77.8442C1052.12 77.1932 1051.86 76.119 1051.86 74.6216C1051.86 71.4966 1053.61 69.0552 1057.13 67.2974C1060.64 65.4744 1069.34 62.3169 1083.2 57.8247C1085.55 57.0435 1088.02 56.1971 1090.62 55.2856C1093.23 54.3091 1095.15 53.5929 1096.39 53.1372C1097.69 52.6815 1099.02 52.2257 1100.39 51.77C1101.76 51.3143 1102.86 51.0213 1103.71 50.8911C1104.56 50.6958 1105.34 50.5981 1106.05 50.5981C1107.29 50.5981 1108.27 50.7284 1108.98 50.9888C1109.77 51.2492 1110.35 51.5096 1110.74 51.77C1111.2 52.0304 1111.49 52.6815 1111.62 53.7231C1111.82 54.6997 1111.91 55.5135 1111.91 56.1646C1111.98 56.7505 1112.01 57.9549 1112.01 59.7778C1111.3 75.7935 1110.74 91.7765 1110.35 107.727C1110.03 123.678 1109.93 134.029 1110.06 138.782C1110.06 141.711 1111.39 143.241 1114.06 143.372C1115.62 143.502 1116.73 143.892 1117.38 144.543C1118.1 145.129 1118.46 146.204 1118.46 147.766C1118.46 150.956 1115.49 154.374 1109.57 158.02C1103.65 161.601 1096.68 163.391 1088.67 163.391C1082.81 163.391 1077.57 161.894 1072.95 158.899C1068.39 155.969 1065.23 152.193 1063.48 147.571C1059.44 152.389 1055.01 156.165 1050.2 158.899C1045.38 161.633 1039.39 163 1032.23 163Z"
                    fill="currentColor"
                  />
                  <path
                    d="M1180.66 163.196C1172.46 163.196 1164.68 161.666 1157.32 158.606C1150.03 155.546 1143.85 151.51 1138.77 146.497C1133.76 141.418 1129.79 135.592 1126.86 129.016C1123.93 122.441 1122.46 115.702 1122.46 108.801C1122.46 97.1476 1125.07 86.8937 1130.27 78.0396C1135.55 69.1203 1142.64 62.3494 1151.56 57.7271C1160.48 53.1047 1170.51 50.7935 1181.64 50.7935C1194.34 50.7935 1204.72 54.0161 1212.79 60.4614C1220.93 66.8416 1226.2 76.0864 1228.61 88.1958C1229.33 91.7765 1229.3 94.4458 1228.52 96.2036C1227.73 97.8963 1225.91 99.231 1223.05 100.208C1217.38 102.226 1209.24 104.179 1198.63 106.067C1188.02 107.89 1177.54 109.192 1167.19 109.973C1168.62 119.088 1171.45 125.468 1175.68 129.114C1179.92 132.76 1186.56 134.583 1195.61 134.583C1204.07 134.583 1211.62 132.922 1218.26 129.602C1222.69 127.519 1225.36 127.649 1226.27 129.993C1226.92 131.881 1225.72 134.875 1222.66 138.977C1211.91 155.123 1197.92 163.196 1180.66 163.196ZM1165.82 82.4341C1165.82 88.6841 1165.89 93.1437 1166.02 95.813C1169.92 95.6177 1173.67 95.2271 1177.25 94.6411C1180.96 94.1203 1183.2 93.3065 1183.98 92.1997C1184.83 91.0929 1185.25 88.8794 1185.25 85.5591C1185.25 78.4627 1184.28 72.8963 1182.32 68.8599C1180.44 64.8234 1177.8 62.8052 1174.41 62.8052C1171.74 62.8052 1169.63 64.563 1168.07 68.0786C1166.57 71.5942 1165.82 76.3794 1165.82 82.4341Z"
                    fill="currentColor"
                  />
                </svg>
              </>
            ) : (
              <h1 className="mb-4 text-4xl font-bold sm:text-6xl md:text-8xl lg:text-9xl">
                {content[domain]?.title}
              </h1>
            )}

            <p className="mb-2 text-lg">{content[domain]?.subtitle}</p>
            <p
              className="text-sm text-gray-700 dark:text-[#FEF3E2]/80"
              dangerouslySetInnerHTML={{ __html: content[domain]?.description }}
            ></p>
          </div>
          <form action="">
            <div className="grid w-full items-center gap-1.5 lg:max-w-2xl">
              <Input
                type="hidden"
                name="t"
                value={Array.from(
                  { length: 600 },
                  () => Math.random().toString(36)[2]
                ).join("")}
                required
              />
              <div className="flex items-center space-x-2 w-full lg:max-w-2xl">
                <Input
                  type="text"
                  name="post"
                  placeholder="https://bsky.app/profile/sound3vision.bsky.social/post/3jzrqio5pxi27"
                  defaultValue={post}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  name="user"
                  placeholder="E-mail ou Usuário"
                  defaultValue={user}
                  required
                />
                <Input
                  type="password"
                  name="pass"
                  placeholder={content[domain]?.form?.pass}
                  defaultValue={pass}
                  required
                />
                <Button type="submit">{content[domain]?.form?.submit}</Button>
              </div>

              {error1 && (
                <p className="flex flex-row gap-2 items-center text-sm text-red-400">
                  <X className="w-4 h-4" /> {error1}
                </p>
              )}
            </div>

            {content[domain]?.title === "sorteio.blue" && !post && (
              <div className="p-3 my-4 w-full text-sm rounded-lg border border-none bg-[#208BFE]/5 shadow dark:bg-black/20 lg:max-w-2xl">
                <p className="pb-4">
                  Para evitar sobrecarga dos servidores, agora é necessário{" "}
                  <strong>autenticar seu usuário no Bluesky</strong>. Utilize
                  uma senha criada <strong>apenas para o sorteios.blue</strong>{" "}
                  usando um App Password em:{" "}
                  <a
                    href="https://bsky.app/settings/app-passwords"
                    rel="noopener"
                    className="border-b border-[#208BFE] text-[#208BFE] dark:border-[#95cad9] dark:text-[#95cad9]"
                    target="_blank"
                  >
                    https://bsky.app/settings/app-passwords
                  </a>
                </p>
                <p className="pb-4">
                  O App Password tem 11 dígitos, no formato{" "}
                  <span className="font-mono">xxxx-xxxx-xxxx-xxxx</span>. Ele
                  será enviado diretamente ao Bluesky.{" "}
                  <strong>
                    O sorteios.blue não salva nenhuma infomação sua.
                  </strong>
                </p>
                <p>
                  Após o sorteio, <strong>exclua o App Password gerado</strong>.
                </p>
              </div>
            )}
          </form>
        </div>
        <div className="gap-x-16 lg:flex lg:flex-row">
          {!!postCombined && (
            <div className="basis-1/4">
              <h2 className="mb-2 text-2xl font-bold">
                {content[domain]?.results?.postCombined.title}
              </h2>
              <p>
                {postCombined.length}{" "}
                {content[domain]?.results?.postCombined.info}
              </p>

              {postCombined
                .sort((a: any, b: any) => 0.5 - Math.random())
                .map((profile: any, i: number) => {
                  return (
                    <div className="relative" key={i + 1}>
                      <div className="absolute top-0 left-0 px-1 h-4 text-xs text-center rounded bg-slate-100 dark:bg-slate-800">
                        {i + 1}
                      </div>
                      <div>
                        <a
                          href={`https://bsky.app/profile/${profile.handle}`}
                          target="_blank"
                        >
                          <Profile profile={profile} className="mt-4" />
                        </a>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          {!!postCombinedOr && (
            <div className="basis-1/4">
              <h2 className="mb-2 text-2xl font-bold">
                {content[domain]?.results?.postCombinedOr.title}
              </h2>
              <p>
                {postCombinedOr.length}{" "}
                {content[domain]?.results?.postCombinedOr.info}
              </p>

              {postCombinedOr
                .sort((a: any, b: any) => 0.5 - Math.random())
                .map((profile: any, i: number) => {
                  return (
                    <div className="relative" key={i + 1}>
                      <div className="absolute top-0 left-0 px-1 h-4 text-xs text-center rounded bg-slate-100 dark:bg-slate-800">
                        {i + 1}
                      </div>
                      <div>
                        <a
                          href={`https://bsky.app/profile/${profile.handle}`}
                          target="_blank"
                        >
                          <Profile profile={profile} className="mt-4" />
                        </a>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          {!!postReposts && (
            <div className="basis-1/4">
              <h2 className="mb-2 text-2xl font-bold">
                {content[domain]?.results?.postReposts.title}
              </h2>
              <p>
                {postReposts.length}{" "}
                {content[domain]?.results?.postReposts.info}
              </p>

              {postReposts
                .sort((a: any, b: any) => 0.5 - Math.random())
                .map((profile: any, i: number) => {
                  return (
                    <div className="relative" key={i + 1}>
                      <div className="absolute top-0 left-0 px-1 h-4 text-xs text-center rounded bg-slate-100 dark:bg-slate-800">
                        {i + 1}
                      </div>
                      <div>
                        <a
                          href={`https://bsky.app/profile/${profile.handle}`}
                          target="_blank"
                        >
                          <Profile profile={profile} className="mt-4" />
                        </a>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          {!!postLikes && (
            <div className="basis-1/4">
              <h2 className="mb-2 text-2xl font-bold">
                {content[domain]?.results?.postLikes.title}
              </h2>
              <p>
                {postLikes.length} {content[domain]?.results?.postLikes.info}
              </p>

              {postLikes
                .sort((a: any, b: any) => 0.5 - Math.random())
                .map((profile: any, i: number) => {
                  return (
                    <div className="relative" key={i + 1}>
                      <div className="absolute top-0 left-0 px-1 h-4 text-xs text-center rounded bg-slate-100 dark:bg-slate-800">
                        {i + 1}
                      </div>
                      <div>
                        <a
                          href={`https://bsky.app/profile/${profile.handle}`}
                          target="_blank"
                        >
                          <Profile profile={profile} className="mt-4" />
                        </a>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </main>
      <footer className="container grid gap-2 items-center mb-8">
        <p
          className="text-xs"
          dangerouslySetInnerHTML={{ __html: content[domain]?.footer?.by }}
        ></p>
        <p className="text-[0.7rem] text-gray-700 dark:text-[#FEF3E2]/80">
          {content[domain]?.footer?.noCookies}
        </p>
        <a
          href="https://github.com/breakzplatform/skypicker.site"
          className="github-corner"
          aria-label={content[domain]?.footer?.ghFork}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 250 250"
            style={{
              position: "absolute",
              top: "0",
              border: "0",
              right: "0",
            }}
            className="text-[#f4f4f4] dark:text-[#102642] dark:fill-[#95cad9] fill-[#208BFE]"
            aria-hidden="true"
          >
            <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
            <path
              d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
              fill="currentColor"
              style={{ transformOrigin: "130px 106px" }}
              className="octo-arm"
            ></path>
            <path
              d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z"
              fill="currentColor"
              className="octo-body"
            ></path>
          </svg>
        </a>
      </footer>
    </>
  )
}
