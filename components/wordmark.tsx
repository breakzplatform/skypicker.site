import type { SiteContent } from "@/lib/site"

/** The site name in CMU Serif with one part of it on a tilted ink block. */
export function Wordmark({
  content,
  as: Tag = "h1",
}: {
  content: SiteContent
  as?: "h1" | "p"
}) {
  return (
    <Tag className="sp-wordmark">
      <span>
        {content.wordmark.before}
        <span className="ink-block tilt-cw">{content.wordmark.ink}</span>
        {content.wordmark.after}
      </span>
    </Tag>
  )
}
