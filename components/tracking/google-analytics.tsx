'use client'

import Script from 'next/script'

const GA_MEASUREMENT_ID = 'G-4WM1HF6WMS'

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}

/**
 * Set brand-level custom dimensions on memo pages.
 * Call this component on any page where brand context is available.
 * 
 * In GA4 Admin, create matching custom dimensions:
 * - brand_name (event-scoped)
 * - brand_subdomain (event-scoped)
 * - memo_type (event-scoped)
 * - content_source (event-scoped) — "contextmemo" or "hubspot"
 */
export function GtagBrandPageView({ 
  brandName, 
  brandSubdomain, 
  memoType,
  memoTitle,
  contentSource = 'contextmemo',
}: { 
  brandName: string
  brandSubdomain: string
  memoType?: string
  memoTitle?: string
  contentSource?: 'contextmemo' | 'hubspot'
}) {
  return (
    <Script id="gtag-brand-dimensions" strategy="afterInteractive">
      {`
        if (typeof gtag === 'function') {
          gtag('event', 'memo_view', {
            brand_name: ${JSON.stringify(brandName)},
            brand_subdomain: ${JSON.stringify(brandSubdomain)},
            memo_type: ${JSON.stringify(memoType || 'unknown')},
            memo_title: ${JSON.stringify(memoTitle || '')},
            content_source: ${JSON.stringify(contentSource)}
          });
        }
      `}
    </Script>
  )
}
