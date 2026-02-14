'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera } from 'lucide-react'

interface BrandLogoProps {
  domain?: string | null
  name: string
  size?: number
  logoUrl?: string | null
  brandId?: string
  editable?: boolean
}

export function BrandLogo({ name, size = 32, logoUrl, brandId, editable = false }: BrandLogoProps) {
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !brandId) return

    setError(null)

    // Validate file type client-side
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setError('Use PNG, JPG, WebP, or SVG')
      return
    }

    // Validate dimensions (skip for SVG)
    if (file.type !== 'image/svg+xml') {
      const valid = await validateDimensions(file, 150, 150)
      if (!valid) {
        setError('Minimum 150×150px')
        return
      }
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch(`/api/brands/${brandId}/logo`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Upload failed')
        return
      }

      const data = await res.json()
      setCurrentLogoUrl(data.logo_url)
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [brandId])

  const handleClick = useCallback(() => {
    if (editable && brandId && !uploading) {
      fileInputRef.current?.click()
    }
  }, [editable, brandId, uploading])

  return (
    <div className="relative group">
      <div
        className={`rounded bg-[#0F172A] flex items-center justify-center text-white font-bold shrink-0 overflow-hidden ${
          editable ? 'cursor-pointer' : ''
        }`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        onClick={handleClick}
      >
        {currentLogoUrl ? (
          <img
            src={currentLogoUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}

        {/* Hover overlay */}
        {editable && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="text-white" style={{ width: size * 0.35, height: size * 0.35 }} />
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileSelect}
        />
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-red-600 text-white text-[10px] font-medium rounded whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  )
}

function validateDimensions(file: File, minW: number, minH: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img.width >= minW && img.height >= minH)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      resolve(false)
    }
    img.src = URL.createObjectURL(file)
  })
}
