import type { NextConfig } from 'next'

const basePath = process.env.BASEPATH ?? ''

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_SISCOTA_BASE_PATH: basePath },
  reactStrictMode: true,
  experimental: { cpus: 2 },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
}

export default nextConfig
