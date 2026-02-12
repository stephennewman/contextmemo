import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  compress: true,
  // Absolute asset prefix so proxied pages load JS/CSS/fonts from contextmemo.com
  // instead of the proxy domain (avoids /_next conflicts with proxy's own Next.js app)
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  async redirects() {
    return [
      // Retired pages → redirect to relevant live pages
      {
        source: '/hubspot',
        destination: '/request-access',
        permanent: true,
      },
      {
        source: '/pricing/calculator',
        destination: '/pricing',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://contextmemo.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://contextmemo.com https://fonts.googleapis.com; font-src 'self' https://contextmemo.com https://fonts.gstatic.com data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // Upload source maps for readable stack traces
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress Sentry CLI logs during build
  silent: !process.env.CI,
});
