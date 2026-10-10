import { cn } from "@/lib/utils"

/** The target mark; same geometry as public/icon.svg and the OG images. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="14" className="fill-brand" />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        strokeWidth="7"
        className="stroke-brand-foreground"
      />
      <circle cx="32" cy="32" r="6.5" className="fill-brand-foreground" />
    </svg>
  )
}
