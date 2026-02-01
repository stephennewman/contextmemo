'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ExportDropdownProps {
  brandId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

type ExportType = 'scans' | 'prompts' | 'memos' | 'competitors' | 'visibility'
type ExportFormat = 'csv' | 'json'

const exportLabels: Record<ExportType, string> = {
  scans: 'Scan Results',
  prompts: 'Prompts',
  memos: 'Memos',
  competitors: 'Competitors',
  visibility: 'Visibility History',
}

export function ExportDropdown({ brandId, variant = 'outline', size = 'sm' }: ExportDropdownProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleExport = async (type: ExportType, format: ExportFormat) => {
    const key = `${type}-${format}`
    setLoading(key)

    try {
      const response = await fetch(`/api/brands/${brandId}/export?type=${type}&format=${format}&days=90`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the blob and create download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Extract filename from content-disposition header or generate one
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${type}-export.${format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`${exportLabels[type]} exported successfully`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="rounded-none border-2 border-[#0F172A] hover:bg-[#0F172A] hover:text-white">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="ml-2">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Scans */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Scan Results (90 days)</DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleExport('scans', 'csv')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('scans', 'json')}
          disabled={loading !== null}
        >
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Prompts */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Prompts & Visibility</DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleExport('prompts', 'csv')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Prompts CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('visibility', 'csv')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Visibility History CSV
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Other */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Other Data</DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleExport('memos', 'csv')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Memos CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('competitors', 'csv')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Competitors CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
