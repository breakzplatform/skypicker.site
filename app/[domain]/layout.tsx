import { siteConfig } from "@/config/site"
import { MainNav } from "@/components/main-nav"
import { SiteHeader } from "@/components/site-header"

interface Props {
  children: React.ReactNode
  params: { domain: string }
}

export default function DomainLayout({ children, params }: Props) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  )
}
