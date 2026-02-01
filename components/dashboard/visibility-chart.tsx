'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ReferenceLine,
  ComposedChart,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ScanResult {
  id: string
  scanned_at: string
  brand_mentioned: boolean
  model: string
  query_id: string
}

interface Query {
  id: string
  query_text: string
}

interface VisibilityChartProps {
  scanResults: ScanResult[]
  industryCategory?: string // e.g., 'saas', 'ecommerce', 'services'
  brandName?: string
  queries?: Query[]
}

interface DataPoint {
  date: string
  displayDate: string
  visibility: number | null
  visibilityHistorical: number | null
  visibilityProjection: number | null
  openai: number
  claude: number
  totalScans: number
  mentionedScans: number
  isToday: boolean
  isProjection: boolean
  isHistorical: boolean
  estimatedQueries: number
  estimatedValue: number
}

// Industry benchmarks for AI visibility (rough estimates)
const INDUSTRY_BENCHMARKS = {
  saas: { avgVisibility: 15, queryVolume: 50000, valuePerQuery: 0.50 },
  ecommerce: { avgVisibility: 8, queryVolume: 200000, valuePerQuery: 0.25 },
  services: { avgVisibility: 12, queryVolume: 30000, valuePerQuery: 1.00 },
  default: { avgVisibility: 10, queryVolume: 75000, valuePerQuery: 0.40 },
}

// Calculate days until end of year
function getDaysUntilEndOfYear(): number {
  const today = new Date()
  const endOfYear = new Date(today.getFullYear(), 11, 31)
  return Math.ceil((endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Helper to generate dates
function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

// Format currency
function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export function VisibilityChart({ scanResults, industryCategory = 'default', brandName, queries }: VisibilityChartProps) {
  const benchmarks = INDUSTRY_BENCHMARKS[industryCategory as keyof typeof INDUSTRY_BENCHMARKS] || INDUSTRY_BENCHMARKS.default

  // Create set of branded query IDs to exclude from visibility calculation
  const brandedQueryIds = useMemo(() => {
    if (!brandName || !queries) return new Set<string>()
    const brandNameLower = brandName.toLowerCase()
    return new Set(
      queries
        .filter(q => q.query_text.toLowerCase().includes(brandNameLower))
        .map(q => q.id)
    )
  }, [brandName, queries])

  // Filter out branded queries from scan results
  const filteredScanResults = useMemo(() => {
    if (brandedQueryIds.size === 0) return scanResults
    return scanResults.filter(s => !brandedQueryIds.has(s.query_id))
  }, [scanResults, brandedQueryIds])

  const { chartData, metrics, todayIndex } = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const daysUntilEOY = getDaysUntilEndOfYear()
    
    // Exponential growth function - slow start, accelerating over time (hockey stick)
    // Shows compounding value of AI visibility optimization
    const calculateProjectedVisibility = (currentVisibility: number, daysFromNow: number, targetMax: number = 70) => {
      // Use exponential/power curve: starts slow, accelerates over time
      // Formula: current + (target - current) * (days/totalDays)^exponent
      const totalDays = Math.max(daysUntilEOY, 180) // Normalize to EOY or 6 months
      const exponent = 2.2 // Higher = more hockey stick effect
      const progress = Math.min(daysFromNow / totalDays, 1) // 0 to 1
      const potential = targetMax - currentVisibility
      const growth = potential * Math.pow(progress, exponent)
      return Math.min(targetMax, Math.round(currentVisibility + growth))
    }
    
    // If no scan data, show demo data with projections
    if (!filteredScanResults || filteredScanResults.length === 0) {
      const demoData: DataPoint[] = []
      
      // Historical: 60 days back (show ~2 months of baseline)
      // Future: to end of year
      const historicalDays = 60
      const totalProjectionDays = Math.max(daysUntilEOY, 90) // At least 90 days projection
      
      // Sample weekly for cleaner chart
      const sampleInterval = 7 // days between points
      
      for (let i = -historicalDays; i <= totalProjectionDays; i += sampleInterval) {
        // Always include today
        if (i > 0 && i < sampleInterval) continue
        const actualDay = i === 0 ? 0 : i
        
        const date = new Date()
        date.setDate(date.getDate() + actualDay)
        const dateStr = date.toISOString().split('T')[0]
        const isToday = actualDay === 0
        const isProjection = actualDay > 0
        const isHistorical = actualDay < 0
        
        let visibility: number
        
        if (isHistorical) {
          // Historical: flat around baseline with slight noise
          const noise = (Math.random() - 0.5) * 3
          visibility = Math.max(0, Math.min(100, Math.round(benchmarks.avgVisibility + noise)))
        } else if (isToday) {
          visibility = benchmarks.avgVisibility
        } else {
          // Projection: logarithmic growth curve
          visibility = calculateProjectedVisibility(benchmarks.avgVisibility, actualDay)
        }
        
        demoData.push({
          date: dateStr,
          displayDate: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          visibility: isToday ? visibility : null,
          visibilityHistorical: isHistorical ? visibility : (isToday ? visibility : null),
          visibilityProjection: isProjection ? visibility : (isToday ? visibility : null),
          openai: 0,
          claude: 0,
          totalScans: 0,
          mentionedScans: 0,
          isToday,
          isProjection,
          isHistorical,
          estimatedQueries: Math.round((benchmarks.queryVolume / 30) * (visibility / 100)),
          estimatedValue: Math.round((benchmarks.queryVolume / 30) * (visibility / 100) * benchmarks.valuePerQuery),
        })
      }
      
      const todayIdx = demoData.findIndex(d => d.isToday)
      
      return { 
        chartData: demoData, 
        metrics: calculateMetrics(demoData, benchmarks, daysUntilEOY),
        todayIndex: todayIdx
      }
    }

    // Group scans by date
    const scansByDate = new Map<string, ScanResult[]>()
    
    filteredScanResults.forEach(scan => {
      const date = new Date(scan.scanned_at).toISOString().split('T')[0]
      if (!scansByDate.has(date)) {
        scansByDate.set(date, [])
      }
      scansByDate.get(date)!.push(scan)
    })

    const sortedActualDates = Array.from(scansByDate.keys()).sort()
    const firstActualDate = sortedActualDates[0]
    
    // Calculate actual visibility data
    const actualDataByDate = new Map<string, { visibility: number; openai: number; claude: number; totalScans: number; mentionedScans: number }>()
    
    sortedActualDates.forEach(date => {
      const scans = scansByDate.get(date)!
      const totalScans = scans.length
      const mentionedScans = scans.filter(s => s.brand_mentioned).length
      const visibility = Math.round((mentionedScans / totalScans) * 100)
      
      const openaiScans = scans.filter(s => s.model.includes('gpt'))
      const claudeScans = scans.filter(s => s.model.includes('claude'))
      
      const openaiVisibility = openaiScans.length > 0
        ? Math.round((openaiScans.filter(s => s.brand_mentioned).length / openaiScans.length) * 100)
        : 0
      
      const claudeVisibility = claudeScans.length > 0
        ? Math.round((claudeScans.filter(s => s.brand_mentioned).length / claudeScans.length) * 100)
        : 0

      actualDataByDate.set(date, {
        visibility,
        openai: openaiVisibility,
        claude: claudeVisibility,
        totalScans,
        mentionedScans,
      })
    })

    // Calculate current visibility (most recent or average of last few days)
    const actualVisibilities = Array.from(actualDataByDate.values()).map(d => d.visibility)
    const currentVisibility = actualVisibilities.length > 0 
      ? actualVisibilities[actualVisibilities.length - 1] 
      : benchmarks.avgVisibility
    
    // Build chart data with weekly sampling for long-term view
    const dataPoints: DataPoint[] = []
    let todayIdx = 0
    
    // Historical: 60 days before first actual scan
    const historicalStart = new Date(firstActualDate)
    historicalStart.setDate(historicalStart.getDate() - 60)
    
    // End of year projection
    const projectionEnd = new Date(today.getFullYear(), 11, 31)
    
    // Generate all dates but sample for display
    const currentDate = new Date(historicalStart)
    let pointIndex = 0
    
    while (currentDate <= projectionEnd) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const isToday = dateStr === todayStr
      const isActual = actualDataByDate.has(dateStr)
      const isBeforeFirstActual = dateStr < firstActualDate
      const isProjection = dateStr > todayStr
      const isHistorical = isBeforeFirstActual
      
      // Determine if we should include this point
      // Include: today, actual data points, and weekly samples
      const dayOfWeek = currentDate.getDay()
      const isWeeklySample = dayOfWeek === 1 // Monday
      const shouldInclude = isToday || isActual || isWeeklySample
      
      if (shouldInclude) {
        if (isToday) todayIdx = pointIndex
        
        let visibility: number
        let openai = 0
        let claude = 0
        let totalScans = 0
        let mentionedScans = 0
        
        if (isActual) {
          const actual = actualDataByDate.get(dateStr)!
          visibility = actual.visibility
          openai = actual.openai
          claude = actual.claude
          totalScans = actual.totalScans
          mentionedScans = actual.mentionedScans
        } else if (isBeforeFirstActual) {
          // Historical estimate: flat baseline around industry avg
          const noise = (Math.random() - 0.5) * 3
          visibility = Math.max(0, Math.min(100, Math.round(benchmarks.avgVisibility + noise)))
        } else if (isProjection) {
          // Future projection: logarithmic growth from current level
          const daysFromToday = Math.floor((currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          visibility = calculateProjectedVisibility(currentVisibility, daysFromToday)
        } else {
          // Gap between actual dates
          visibility = currentVisibility
        }
        
        dataPoints.push({
          date: dateStr,
          displayDate: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          visibility: isActual || isToday ? visibility : null,
          visibilityHistorical: isHistorical ? visibility : (isActual && !isToday ? visibility : null),
          visibilityProjection: isProjection ? visibility : (isToday ? visibility : null),
          openai,
          claude,
          totalScans,
          mentionedScans,
          isToday,
          isProjection,
          isHistorical,
          estimatedQueries: Math.round((benchmarks.queryVolume / 30) * (visibility / 100)),
          estimatedValue: Math.round((benchmarks.queryVolume / 30) * (visibility / 100) * benchmarks.valuePerQuery),
        })
        pointIndex++
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return { 
      chartData: dataPoints, 
      metrics: calculateMetrics(dataPoints, benchmarks, daysUntilEOY),
      todayIndex: todayIdx
    }
  }, [filteredScanResults, benchmarks])

  // Calculate aggregate metrics
  function calculateMetrics(data: DataPoint[], bench: typeof benchmarks, daysUntilEOY: number = 180) {
    const todayData = data.find(d => d.isToday)
    const currentVisibility = todayData?.visibility || todayData?.visibilityHistorical || bench.avgVisibility
    
    // Get end-of-year projection (last projection point)
    const projections = data.filter(d => d.isProjection && d.visibilityProjection !== null)
    const eoyProjection = projections[projections.length - 1]
    const eoyVisibility = eoyProjection?.visibilityProjection || currentVisibility
    
    // Also get 90-day projection for comparison
    const today = new Date()
    const ninetyDaysOut = new Date(today)
    ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)
    const ninetyDayStr = ninetyDaysOut.toISOString().split('T')[0]
    const nearTermProjection = projections.find(d => d.date >= ninetyDayStr) || projections[Math.floor(projections.length / 3)]
    const ninetyDayVisibility = nearTermProjection?.visibilityProjection || currentVisibility
    
    // Monthly estimates (current)
    const monthlyQueries = Math.round(bench.queryVolume * (currentVisibility / 100))
    const monthlyValue = Math.round(monthlyQueries * bench.valuePerQuery)
    
    // EOY monthly estimates
    const eoyMonthlyQueries = Math.round(bench.queryVolume * (eoyVisibility / 100))
    const eoyMonthlyValue = Math.round(eoyMonthlyQueries * bench.valuePerQuery)
    
    // Calculate total value opportunity for rest of year
    // Use average of current and projected
    const avgVisibility = (currentVisibility + eoyVisibility) / 2
    const monthsRemaining = daysUntilEOY / 30
    const totalYearValue = Math.round(bench.queryVolume * (avgVisibility / 100) * bench.valuePerQuery * monthsRemaining)
    
    // Growth potential
    const potentialGrowth = eoyVisibility - currentVisibility
    
    return {
      currentVisibility,
      projectedVisibility: eoyVisibility,
      ninetyDayVisibility,
      monthlyQueries,
      monthlyValue,
      projectedMonthlyQueries: eoyMonthlyQueries,
      projectedMonthlyValue: eoyMonthlyValue,
      totalYearValue,
      potentialGrowth,
      benchmarkVisibility: bench.avgVisibility,
      monthsRemaining: Math.round(monthsRemaining),
    }
  }

  // Custom dot for today marker
  const renderTodayDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload?.isToday) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill="hsl(var(--primary))" opacity={0.3} />
          <circle cx={cx} cy={cy} r={5} fill="hsl(var(--primary))" stroke="#fff" strokeWidth={2} />
        </g>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics - simplified to 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Visibility</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{metrics.currentVisibility}%</p>
                  <span className="text-sm text-muted-foreground">→ {metrics.projectedVisibility}% by EOY</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Est. Value</p>
                <p className="text-lg font-semibold">{formatCurrency(metrics.monthlyValue)}/mo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-linear-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-900">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metrics.monthsRemaining}-Month Opportunity</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(metrics.totalYearValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">EOY Monthly</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(metrics.projectedMonthlyValue)}/mo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Visibility Over Time</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-gray-400 inline-block"></span>
                Historical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-primary inline-block"></span>
                Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-orange-500 inline-block"></span>
                Projected
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                  className="text-muted-foreground"
                />
                
                {/* TODAY reference line */}
                <ReferenceLine
                  x={chartData[todayIndex]?.displayDate}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'TODAY',
                    position: 'top',
                    fill: 'hsl(var(--primary))',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
                
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DataPoint
                      const visValue = data.visibility ?? data.visibilityHistorical ?? data.visibilityProjection ?? 0
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[180px]">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{label}</p>
                            {data.isToday && <Badge className="text-[10px] px-1.5 py-0">TODAY</Badge>}
                            {data.isProjection && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-500">PROJECTED</Badge>}
                            {data.isHistorical && !data.totalScans && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">EST.</Badge>}
                          </div>
                          <p className="text-lg font-bold text-primary">
                            {visValue}% visibility
                          </p>
                          {data.totalScans > 0 && (
                            <>
                              <p className="text-sm text-green-600">
                                OpenAI: {data.openai}%
                              </p>
                              <p className="text-sm text-orange-500">
                                Claude: {data.claude}%
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {data.mentionedScans}/{data.totalScans} mentions
                              </p>
                            </>
                          )}
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Est. ~{formatNumber(data.estimatedQueries)} queries/day
                            </p>
                            <p className="text-xs text-green-600">
                              Est. ~{formatCurrency(data.estimatedValue)}/day value
                            </p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                
                {/* Historical estimate (gray, dashed) */}
                <Area
                  type="monotone"
                  dataKey="visibilityHistorical"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#historicalGradient)"
                  connectNulls={false}
                  name="Historical Estimate"
                />
                
                {/* Actual data (primary color, solid) */}
                <Area
                  type="monotone"
                  dataKey="visibility"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#actualGradient)"
                  connectNulls={false}
                  dot={renderTodayDot}
                  name="Actual"
                />
                
                {/* Future projection (orange, dashed) */}
                <Area
                  type="monotone"
                  dataKey="visibilityProjection"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="url(#projectionGradient)"
                  connectNulls={false}
                  name="Projection"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Model breakdown - only show if we have actual data */}
          {filteredScanResults && filteredScanResults.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Visibility by Model</p>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.filter(d => d.totalScans > 0)} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="openai"
                      name="OpenAI"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="claude"
                      name="Claude"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
