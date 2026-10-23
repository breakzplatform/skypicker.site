import type { Metadata } from "next"

import "@/styles/globals.css"

import { getSiteDomain, siteContent } from "@/lib/site"
import { THEME_BOOT_SCRIPT } from "@/lib/theme"
import { TailwindIndicator } from "@/components/tailwind-indicator"

const FONT_HOST = "https://static.joseli.to"
const FIRST_PAINT_FONTS = [
  "cmu-serif-700-roman",
  "cmu-sans-serif-500-roman",
  "cmu-sans-serif-700-roman",
]

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const domain = await getSiteDomain()

  return (
    <html lang={siteContent(domain).meta.lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="preconnect" href={FONT_HOST} crossOrigin="anonymous" />
        {FIRST_PAINT_FONTS.map((font) => (
          <link
            key={font}
            rel="preload"
            as="font"
            type="font/woff2"
            href={`${FONT_HOST}/assets/fonts/${font}.woff2`}
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        {children}
        <TailwindIndicator />
      </body>
    </html>
  )
}
