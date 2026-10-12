/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Let Next compile TS workspace packages directly.
  transpilePackages: ['@redflag/shared'],
};

export default nextConfig;
