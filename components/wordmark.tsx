import type { SiteContent } from "@/lib/site"

/** The site name in CMU Serif with its suffix on a tilted ink block. */
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
        {content.wordmark.name}
        <span className="ink-block tilt-cw">{content.wordmark.suffix}</span>
      </span>
    </Tag>
  )
}
