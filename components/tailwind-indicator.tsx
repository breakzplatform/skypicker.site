export function TailwindIndicator() {
  if (process.env.NODE_ENV === "production") return null

  return (
    <div className="meta fixed bottom-1 left-1 z-50 border-2 border-solid px-1">
      <span className="sm:hidden">xs</span>
      <span className="hidden sm:inline md:hidden">sm</span>
      <span className="hidden md:inline lg:hidden">md</span>
      <span className="hidden lg:inline">lg</span>
    </div>
  )
}
