'use client'

import { useState } from 'react'

export function BrandLogo({ domain, name, size = 32 }: { domain?: string | null; name: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null

  if (!logoUrl || imgError) {
    return (
      <div 
        className="rounded bg-[#0EA5E9] flex items-center justify-center text-white font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      className="rounded bg-white object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  )
}
