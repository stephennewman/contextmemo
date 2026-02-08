'use client'

export function BrandLogo({ name, size = 32 }: { domain?: string | null; name: string; size?: number }) {
  return (
    <div 
      className="rounded bg-[#0F172A] flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
