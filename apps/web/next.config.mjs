/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework (`X-Powered-By: Next.js`).
  poweredByHeader: false,
  // Let Next compile TS workspace packages directly.
  transpilePackages: ['@redflag/shared'],

  // Deployed (Vercel), the API lives on its own domain. The browser still talks to it through
  // this site's /api, so the auth cookies the API sets land on the web domain, where the
  // middleware and server components read them. Set NEXT_PUBLIC_API_URL to this site's own URL.
  // Web's own routes (e.g. /api/health) are files, so they win over this rewrite.
  async rewrites() {
    const api = process.env.API_PROXY_URL?.replace(/\/+$/, '');
    return api ? [{ source: '/api/:path*', destination: `${api}/api/:path*` }] : [];
  },
};

export default nextConfig;
