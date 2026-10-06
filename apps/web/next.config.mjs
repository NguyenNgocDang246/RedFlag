/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cho phép Next biên dịch package workspace dạng TS trực tiếp.
  transpilePackages: ['@phishgym/shared'],
};

export default nextConfig;
