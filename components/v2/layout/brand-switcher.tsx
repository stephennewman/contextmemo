'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  subdomain: string
  custom_domain?: string | null
  domain_verified?: boolean | null
}

interface BrandSwitcherProps {
  brands: Brand[]
  currentBrandId?: string
}

export function BrandSwitcher({ brands, currentBrandId }: BrandSwitcherProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  
  const currentBrand = brands.find(b => b.id === currentBrandId)
  const isAllBrands = !currentBrandId || pathname === '/v2'

  const handleSelect = (brandId: string | null) => {
    setOpen(false)
    if (brandId === null) {
      router.push('/v2')
    } else {
      router.push(`/v2/brands/${brandId}`)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between px-3 py-2 h-auto hover:bg-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${
              isAllBrands ? 'bg-slate-700' : 'bg-[#0EA5E9]'
            }`}>
              {isAllBrands ? (
                <Building2 className="h-4 w-4 text-slate-300" />
              ) : (
                <span className="text-white font-bold text-sm">
                  {currentBrand?.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">
                {isAllBrands ? 'All Brands' : currentBrand?.name}
              </p>
              <p className="text-xs text-slate-400">
                {isAllBrands ? `${brands.length} brands` : (currentBrand?.custom_domain && currentBrand?.domain_verified ? currentBrand.custom_domain : `${currentBrand?.subdomain}.contextmemo.com`)}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-slate-500 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search brands..." />
          <CommandList>
            <CommandEmpty>No brands found.</CommandEmpty>
            <CommandGroup>
              {/* All Brands option */}
              <CommandItem
                onSelect={() => handleSelect(null)}
                className="flex items-center gap-3 py-2"
              >
                <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center">
                  <Building2 className="h-3 w-3 text-slate-600" />
                </div>
                <span>All Brands</span>
                {isAllBrands && (
                  <Check className="h-4 w-4 ml-auto text-[#0EA5E9]" />
                )}
              </CommandItem>
              
              <CommandSeparator />
              
              {/* Individual brands */}
              {brands.map((brand) => (
                <CommandItem
                  key={brand.id}
                  onSelect={() => handleSelect(brand.id)}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="w-6 h-6 rounded bg-[#0EA5E9] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {brand.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{brand.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {brand.custom_domain && brand.domain_verified ? brand.custom_domain : `${brand.subdomain}.contextmemo.com`}
                    </p>
                  </div>
                  {brand.id === currentBrandId && (
                    <Check className="h-4 w-4 shrink-0 text-[#0EA5E9]" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup>
              <CommandItem asChild>
                <Link href="/brands/new" className="flex items-center gap-3 py-2">
                  <div className="w-6 h-6 rounded border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <Plus className="h-3 w-3 text-slate-400" />
                  </div>
                  <span>Add Brand</span>
                </Link>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
