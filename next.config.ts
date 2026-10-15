import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  headers: async () => [
    {
      // Internal email-signature tool: keep it out of search engines
      source: '/brand/signature',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    },
  ],
};

export default nextConfig;
