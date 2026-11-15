import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH ?? '',
  reactStrictMode: true,
  experimental: { cpus: 2 },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
}

export default nextConfig
