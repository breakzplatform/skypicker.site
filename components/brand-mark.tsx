/**
 * The target mark: a square block of the project ink with the target reversed
 * out of it. Same geometry as public/icon.svg and the OG images.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" fill="var(--project-ink)" />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        strokeWidth="7"
        stroke="var(--project-ink-contrast)"
      />
      <circle cx="32" cy="32" r="6.5" fill="var(--project-ink-contrast)" />
    </svg>
  )
}
