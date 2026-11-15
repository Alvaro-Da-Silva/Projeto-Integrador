import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH ?? '',
  reactStrictMode: true,
  experimental: { cpus: 2 },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8080/api/:path*' }]
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
}

export default nextConfig
