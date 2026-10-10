/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // OG images read Inter from disk at runtime; make sure it ships with them.
  outputFileTracingIncludes: {
    "/r/**": ["./assets/fonts/**"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
