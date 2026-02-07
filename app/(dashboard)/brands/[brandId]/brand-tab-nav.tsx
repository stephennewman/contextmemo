'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TabDef {
  slug: string
  label: string
  count?: number | null
}

interface BrandTabNavProps {
  brandId: string
  tabs: TabDef[]
}

export function BrandTabNav({ brandId, tabs }: BrandTabNavProps) {
  const pathname = usePathname()
  // Extract the active tab from the URL: /brands/[brandId]/[tab]/...
  // Find the segment right after the brandId
  const segments = pathname.split('/')
  const brandIdx = segments.indexOf(brandId)
  const activeTab = (brandIdx >= 0 && segments[brandIdx + 1]) || 'prompts'

  return (
    <nav className="w-full flex border-b-[3px] border-[#0F172A] overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.slug
        return (
          <Link
            key={tab.slug}
            href={`/brands/${brandId}/${tab.slug}`}
            prefetch={true}
            className={`px-4 py-2 font-bold text-xs whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-[#0EA5E9] text-white'
                : 'text-[#0F172A] hover:bg-slate-100'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && ` (${tab.count})`}
          </Link>
        )
      })}
    </nav>
  )
}
