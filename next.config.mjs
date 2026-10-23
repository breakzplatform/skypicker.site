/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // OG images read the CMU fonts from disk at runtime; make sure it ships with them.
  outputFileTracingIncludes: {
    // Covers /r/[snapshot]/opengraph-image and /r/[snapshot]/og.png.
    "/r/**": ["./assets/fonts/**"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
