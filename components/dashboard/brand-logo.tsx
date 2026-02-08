'use client'

import { useState } from 'react'

export function BrandLogo({ domain, name, size = 32 }: { domain?: string | null; name: string; size?: number }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=${Math.max(size * 2, 64)}` : null
  const showImg = logoUrl && !imgError

  return (
    <div 
      className="relative rounded bg-[#0EA5E9] flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {/* Always render initials as base layer */}
      {name.charAt(0).toUpperCase()}

      {/* Overlay image on top only when loaded */}
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          className={`absolute inset-0 w-full h-full rounded bg-white object-contain transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  )
}
