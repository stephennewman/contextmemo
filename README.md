This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Set environment variables in your hosting provider (recommended) or locally in a .env.local file.

Required for Redis Cloud:
- REDIS_URL: Use the Redis Cloud connection string (rediss://) that includes username and password.

Optional configuration:
- STRIPE_WEBHOOK_IP_ALLOWLIST: Comma-separated IPs or * to allow all
- AUTH_RATE_LIMIT_WINDOW_MS: Shared window for auth rate limiting (default 60000)
- AUTH_RATE_LIMIT_MAX_LOGIN: Max login attempts per window (default 8)
- AUTH_RATE_LIMIT_MAX_SIGNUP: Max signup attempts per window (default 5)
- CSRF_ALLOWED_ORIGINS: Comma-separated allowed origins for API POST/PUT/PATCH/DELETE
- SESSION_MAX_AGE_HOURS: Max session age before forced re-login (default 168)
- ADMIN_EMAILS: Comma-separated list of admin emails allowed to access /admin

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

