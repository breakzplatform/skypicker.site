interface Props {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default function DomainLayout({ children }: Props) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  )
}
