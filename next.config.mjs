/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
    serverActions: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
