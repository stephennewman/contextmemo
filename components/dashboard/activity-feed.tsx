'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Activity,
  Filter,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  Globe,
  RefreshCw,
  Database,
  Users,
  Search,
  Newspaper,
  Compass,
  Zap,
  Calendar,
  Plus,
  BadgeCheck,
  AlertTriangle,
  Eye,
  Play,
  Radar,
  Settings,
  Bookmark,
  BookmarkPlus,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { 
  ActivityCategory, 
  ActivityType, 
  ACTIVITY_TYPE_META,
  ACTIVITY_CATEGORY_META 
} from '@/lib/supabase/types'
import { ActivityDetail } from './activity-detail'

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Play,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Globe,
  RefreshCw,
  Database,
  Users,
  Search,
  Newspaper,
  Compass,
  Zap,
  Calendar,
  Plus,
  BadgeCheck,
  AlertTriangle,
  Radar,
  Settings,
  Activity,
}

interface ActivityItem {
  id: string
  brand_id: string
  brand_name?: string
  activity_type: ActivityType
  category: ActivityCategory
  title: string
  description: string | null
  icon: string
  link_url: string | null
  link_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface SavedView {
  id: string
  name: string
  filters: {
    categories?: ActivityCategory[]
    activity_types?: ActivityType[]
    brand_ids?: string[]
  }
  is_default: boolean
}

interface ActivityFeedProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  brands?: { id: string; name: string }[]
}

export function ActivityFeed({ isOpen, onOpenChange, brands = [] }: ActivityFeedProps) {
  const pathname = usePathname()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  
  // Detect current brand from URL (e.g., /brands/[brandId]/...)
  const currentBrandId = pathname?.match(/\/brands\/([^\/]+)/)?.[1] || null
  
  // Filters - auto-select current brand if on a brand page
  const [selectedCategories, setSelectedCategories] = useState<ActivityCategory[]>([])
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [hasAutoSelectedBrand, setHasAutoSelectedBrand] = useState(false)
  
  // Auto-select current brand when opening on a brand page
  useEffect(() => {
    if (isOpen && currentBrandId && !hasAutoSelectedBrand && brands.some(b => b.id === currentBrandId)) {
      setSelectedBrands([currentBrandId])
      setHasAutoSelectedBrand(true)
    }
  }, [isOpen, currentBrandId, brands, hasAutoSelectedBrand])
  
  // Reset auto-selection when URL changes
  useEffect(() => {
    setHasAutoSelectedBrand(false)
  }, [currentBrandId])
  
  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [activeView, setActiveView] = useState<SavedView | null>(null)
  const [savingView, setSavingView] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  
  // Activity detail
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)

  const fetchActivities = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
      setOffset(0)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams()
      if (selectedCategories.length > 0) {
        params.set('categories', selectedCategories.join(','))
      }
      if (selectedTypes.length > 0) {
        params.set('types', selectedTypes.join(','))
      }
      if (selectedBrands.length > 0) {
        params.set('brands', selectedBrands.join(','))
      }
      params.set('limit', '30')
      params.set('offset', reset ? '0' : offset.toString())

      const res = await fetch(`/api/activity?${params.toString()}`)
      const data = await res.json()

      if (reset) {
        setActivities(data.activities || [])
      } else {
        setActivities(prev => [...prev, ...(data.activities || [])])
      }
      setHasMore(data.hasMore || false)
      setOffset(reset ? 30 : offset + 30)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategories, selectedTypes, selectedBrands, offset])

  const fetchSavedViews = useCallback(async () => {
    try {
      // Try API first
      const res = await fetch('/api/activity/views')
      const data = await res.json()
      
      if (data.views && data.views.length > 0) {
        setSavedViews(data.views)
        return
      }
    } catch {
      // Fallback to localStorage
    }

    // Fallback: load from localStorage
    const stored = localStorage.getItem('activity-saved-views')
    if (stored) {
      try {
        setSavedViews(JSON.parse(stored))
      } catch {
        // Invalid JSON
      }
    }
  }, [])

  // Fetch on mount and when filters change
  useEffect(() => {
    if (isOpen) {
      fetchActivities(true)
      fetchSavedViews()
    }
  }, [isOpen, selectedCategories, selectedTypes, selectedBrands])

  const toggleCategory = (category: ActivityCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
    setActiveView(null)
  }

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(b => b !== brandId)
        : [...prev, brandId]
    )
    setActiveView(null)
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedTypes([])
    setSelectedBrands([])
    setActiveView(null)
  }

  const applyView = (view: SavedView) => {
    setSelectedCategories(view.filters.categories || [])
    setSelectedTypes(view.filters.activity_types || [])
    setSelectedBrands(view.filters.brand_ids || [])
    setActiveView(view)
  }

  const saveCurrentView = async () => {
    if (!newViewName.trim()) return

    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: newViewName.trim(),
      filters: {
        categories: selectedCategories,
        activity_types: selectedTypes,
        brand_ids: selectedBrands,
      },
      is_default: false,
    }

    setSavingView(true)
    try {
      // Try API first
      const res = await fetch('/api/activity/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newView.name,
          filters: newView.filters,
          is_default: false,
        }),
      })
      const data = await res.json()
      
      if (data.view) {
        setSavedViews(prev => [data.view, ...prev])
        setActiveView(data.view)
      } else {
        // Fallback to localStorage
        const updated = [newView, ...savedViews]
        setSavedViews(updated)
        localStorage.setItem('activity-saved-views', JSON.stringify(updated))
        setActiveView(newView)
      }
    } catch {
      // Fallback to localStorage
      const updated = [newView, ...savedViews]
      setSavedViews(updated)
      localStorage.setItem('activity-saved-views', JSON.stringify(updated))
      setActiveView(newView)
    } finally {
      setSavingView(false)
      setNewViewName('')
    }
  }

  const deleteView = async (viewId: string) => {
    try {
      await fetch(`/api/activity/views?id=${viewId}`, { method: 'DELETE' })
    } catch {
      // Ignore API errors
    }

    const updated = savedViews.filter(v => v.id !== viewId)
    setSavedViews(updated)
    localStorage.setItem('activity-saved-views', JSON.stringify(updated))
    
    if (activeView?.id === viewId) {
      setActiveView(null)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const hasActiveFilters = selectedCategories.length > 0 || selectedTypes.length > 0 || selectedBrands.length > 0

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md border-l-[3px] border-[#0F172A] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b-[3px] border-[#0F172A] bg-[#0F172A] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#0EA5E9]" />
              <SheetTitle className="text-white font-bold tracking-wide">ACTIVITY</SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* Saved Views Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-white hover:bg-white/10">
                    <Bookmark className="h-4 w-4 mr-1" />
                    {activeView ? activeView.name : 'Views'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-2 border-[#0F172A] rounded-none">
                  <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {savedViews.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      No saved views yet
                    </div>
                  ) : (
                    savedViews.map(view => (
                      <DropdownMenuItem 
                        key={view.id}
                        className="flex items-center justify-between rounded-none"
                        onClick={() => applyView(view)}
                      >
                        <span className={activeView?.id === view.id ? 'font-semibold' : ''}>
                          {view.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteView(view.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </DropdownMenuItem>
                    ))
                  )}
                  {hasActiveFilters && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="View name..."
                          value={newViewName}
                          onChange={(e) => setNewViewName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border-2 border-[#0F172A] rounded-none mb-2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveCurrentView()
                            }
                          }}
                        />
                        <Button 
                          size="sm" 
                          className="w-full rounded-none bg-[#0EA5E9] hover:bg-[#0284C7]"
                          onClick={saveCurrentView}
                          disabled={!newViewName.trim() || savingView}
                        >
                          <BookmarkPlus className="h-4 w-4 mr-1" />
                          Save Current View
                        </Button>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-white hover:bg-white/10 relative">
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#0EA5E9] text-[10px] font-bold flex items-center justify-center">
                        {selectedCategories.length + selectedBrands.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 border-2 border-[#0F172A] rounded-none">
                  <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                  {(Object.keys(ACTIVITY_CATEGORY_META) as ActivityCategory[]).map(cat => {
                    const meta = ACTIVITY_CATEGORY_META[cat]
                    const Icon = ICONS[meta.icon] || Activity
                    return (
                      <DropdownMenuCheckboxItem
                        key={cat}
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => toggleCategory(cat)}
                        className="rounded-none"
                      >
                        <Icon className="h-4 w-4 mr-2" style={{ color: meta.color }} />
                        {meta.label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                  
                  {brands.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Filter by Brand</DropdownMenuLabel>
                      {brands.map(brand => (
                        <DropdownMenuCheckboxItem
                          key={brand.id}
                          checked={selectedBrands.includes(brand.id)}
                          onCheckedChange={() => toggleBrand(brand.id)}
                          className="rounded-none"
                        >
                          {brand.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </>
                  )}
                  
                  {hasActiveFilters && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={clearFilters}
                        className="rounded-none text-red-600"
                      >
                        Clear All Filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <SheetDescription className="text-slate-400 text-xs">
            {selectedBrands.length === 1 && brands.length > 0
              ? `Showing activity for ${brands.find(b => b.id === selectedBrands[0])?.name || 'selected brand'}`
              : hasActiveFilters 
                ? `Filtered: ${selectedCategories.length > 0 ? selectedCategories.join(', ') : 'all categories'}${selectedBrands.length > 1 ? ` • ${selectedBrands.length} brands` : ''}`
                : 'All activity across your brands'
            }
          </SheetDescription>
        </SheetHeader>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-none" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="font-semibold text-[#0F172A]">No activity yet</p>
              <p className="text-sm text-slate-500 mt-1">
                {hasActiveFilters 
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as you use the platform'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {activities.map((activity) => {
                const meta = ACTIVITY_TYPE_META[activity.activity_type]
                const Icon = ICONS[activity.icon] || ICONS[meta?.icon] || Activity
                
                return (
                  <div 
                    key={activity.id}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div 
                        className="h-10 w-10 flex items-center justify-center shrink-0"
                        style={{ 
                          backgroundColor: `${meta?.color || '#6B7280'}15`,
                          borderLeft: `4px solid ${meta?.color || '#6B7280'}`
                        }}
                      >
                        <Icon 
                          className="h-5 w-5" 
                          style={{ color: meta?.color || '#6B7280' }}
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-[#0F172A] leading-tight">
                              {activity.title}
                            </p>
                            {activity.description && (
                              <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatTime(activity.created_at)}
                          </span>
                        </div>
                        
                        {/* Footer */}
                        <div className="flex items-center gap-2 mt-2">
                          {activity.brand_name && brands.length > 1 && (
                            <Badge 
                              variant="outline" 
                              className="text-xs font-medium rounded-none border-[#0F172A] px-1.5 py-0"
                            >
                              {activity.brand_name}
                            </Badge>
                          )}
                          
                          {activity.link_url && (
                            <Link
                              href={activity.link_url}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5E9] hover:underline"
                              onClick={() => onOpenChange(false)}
                            >
                              {activity.link_label || 'View'}
                              {activity.link_url.startsWith('http') ? (
                                <ExternalLink className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Load More */}
              {hasMore && (
                <div className="p-4">
                  <Button
                    variant="outline"
                    className="w-full rounded-none border-2 border-[#0F172A]"
                    onClick={() => fetchActivities(false)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Activity Detail Modal */}
      <ActivityDetail
        activity={selectedActivity}
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </Sheet>
  )
}

// Export a trigger button component for the header
export function ActivityFeedTrigger({ 
  onClick, 
  unreadCount = 0 
}: { 
  onClick: () => void
  unreadCount?: number 
}) {
  return (
    <button 
      onClick={onClick}
      className="p-2 text-slate-400 hover:text-white transition-colors relative"
      title="Activity Feed"
    >
      <Activity className="h-5 w-5" strokeWidth={2.5} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#0EA5E9] text-white text-xs font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
