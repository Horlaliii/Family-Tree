import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The whole site is private: tell every crawler to stay away.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Photos are compressed in the browser, but scanned PDFs can be larger.
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
