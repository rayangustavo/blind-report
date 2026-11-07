/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@blind-report/arkiv-store',
    '@blind-report/core',
    '@blind-report/crypto',
    '@blind-report/ens-client',
    '@blind-report/network-policy',
    '@blind-report/newsroom-client',
    '@blind-report/source-client',
    '@blind-report/worldid-gate',
  ],
}

export default nextConfig
