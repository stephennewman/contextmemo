'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, ChevronDown, TrendingUp, Search, AlertCircle, BarChart3 } from 'lucide-react'

export default function CleanProfessionalMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#FAFAF9',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Back link */}
      <div className="fixed top-4 left-4 z-50">
        <Link 
          href="/mockups" 
          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-md text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to mockups
        </Link>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-40 border-b"
        style={{ 
          backgroundColor: '#FFFFFF',
          borderColor: '#E7E5E4',
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" style={{ color: '#4F46E5' }} />
              <span className="font-semibold text-lg text-zinc-900">Context Memo</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium rounded-md"
                style={{ 
                  color: '#4F46E5',
                  backgroundColor: '#EEF2FF',
                }}
              >
                Dashboard
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 rounded-md hover:bg-zinc-100"
              >
                Brands
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 rounded-md hover:bg-zinc-100"
              >
                Settings
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg">
              <Bell className="h-5 w-5" />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: '#4F46E5' }}
              >
                SN
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500">Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Large visibility card */}
          <div 
            className="md:col-span-1 p-6 rounded-xl"
            style={{ 
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-500">VISIBILITY SCORE</span>
              <TrendingUp className="w-5 h-5" style={{ color: '#22C55E' }} />
            </div>
            <div className="mb-4">
              <span className="text-5xl font-bold text-zinc-900">47%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-zinc-100 mb-3">
              <div 
                className="h-3 rounded-full"
                style={{ 
                  width: '47%',
                  background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
                }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                }}
              >
                ↑ 12%
              </span>
              <span className="text-zinc-500">vs industry average</span>
            </div>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6 rounded-xl"
            style={{ 
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-500">VISIBILITY TREND</span>
              <div className="flex gap-2">
                <button 
                  className="px-3 py-1 text-xs font-medium rounded-md"
                  style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}
                >
                  7D
                </button>
                <button className="px-3 py-1 text-xs font-medium rounded-md text-zinc-500 hover:bg-zinc-100">
                  30D
                </button>
                <button className="px-3 py-1 text-xs font-medium rounded-md text-zinc-500 hover:bg-zinc-100">
                  90D
                </button>
              </div>
            </div>
            {/* Fake chart */}
            <div className="h-48 flex items-end gap-1 pt-4">
              {[35, 38, 42, 40, 45, 43, 47, 44, 48, 46, 50, 47].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 rounded-t"
                  style={{ 
                    height: `${h * 2}%`,
                    backgroundColor: i === 11 ? '#4F46E5' : '#E0E7FF',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-400">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
            </div>
          </div>

          {/* Metric cards */}
          <div 
            className="p-6 rounded-xl"
            style={{ 
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: '#EEF2FF' }}
              >
                <Search className="w-5 h-5" style={{ color: '#4F46E5' }} />
              </div>
              <span className="text-sm font-medium text-zinc-500">Queries</span>
            </div>
            <div className="text-3xl font-bold text-zinc-900">24</div>
            <div className="text-sm text-zinc-500">tracked queries</div>
          </div>

          <div 
            className="p-6 rounded-xl"
            style={{ 
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <FileText className="w-5 h-5" style={{ color: '#D97706' }} />
              </div>
              <span className="text-sm font-medium text-zinc-500">Memos</span>
            </div>
            <div className="text-3xl font-bold text-zinc-900">3</div>
            <div className="text-sm text-zinc-500">published</div>
          </div>

          <div 
            className="p-6 rounded-xl"
            style={{ 
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: '#FEE2E2' }}
              >
                <AlertCircle className="w-5 h-5" style={{ color: '#DC2626' }} />
              </div>
              <span className="text-sm font-medium text-zinc-500">Alerts</span>
            </div>
            <div className="text-3xl font-bold text-zinc-900">2</div>
            <div className="text-sm text-zinc-500">unread</div>
          </div>
        </div>

        {/* Recent activity */}
        <div 
          className="mt-6 p-6 rounded-xl"
          style={{ 
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h3 className="text-sm font-medium text-zinc-500 mb-4">RECENT ACTIVITY</h3>
          <div className="space-y-4">
            {[
              { action: 'Scan completed', brand: 'Acme Corp', time: '2 hours ago', type: 'scan' },
              { action: 'Memo generated', brand: 'Acme Corp', time: '1 day ago', type: 'memo' },
              { action: 'Visibility dropped', brand: 'Acme Corp', time: '2 days ago', type: 'alert' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: item.type === 'scan' ? '#4F46E5' : 
                                       item.type === 'memo' ? '#D97706' : '#DC2626'
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.action}</p>
                    <p className="text-xs text-zinc-500">{item.brand}</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Style label */}
      <div className="fixed bottom-4 right-4 px-4 py-2 bg-white rounded-full shadow-lg text-sm font-medium">
        Style: Clean Professional
      </div>
    </div>
  )
}
