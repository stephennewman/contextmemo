'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, TrendingUp, Search, AlertCircle, Zap, User } from 'lucide-react'

export default function BoldMarketingMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#FFFFFF',
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
      }}
    >
      {/* Google Font import */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
      `}</style>

      {/* Back link */}
      <div className="fixed top-4 left-4 z-50">
        <Link 
          href="/mockups" 
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium hover:bg-zinc-800"
          style={{ borderRadius: '4px' }}
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </Link>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-40"
        style={{ 
          backgroundColor: '#FFFFFF',
          borderBottom: '3px solid #000000',
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <Zap className="h-7 w-7" style={{ color: '#2563EB' }} />
              <span className="font-bold text-xl tracking-tight text-black">CONTEXT MEMO</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide"
                style={{ 
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                }}
              >
                DASHBOARD
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide text-black hover:bg-zinc-100"
              >
                BRANDS
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide text-black hover:bg-zinc-100"
              >
                SETTINGS
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-black hover:bg-zinc-100">
              <Bell className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div 
              className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: '#000000' }}
            >
              SN
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black tracking-tight">DASHBOARD</h1>
          <p className="text-zinc-500 font-medium">Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Large visibility card */}
          <div 
            className="md:col-span-1 p-6"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #000000',
              borderLeft: '8px solid #2563EB',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest text-zinc-500">VISIBILITY</span>
              <div 
                className="px-2 py-1 text-xs font-bold"
                style={{ 
                  backgroundColor: '#84CC16',
                  color: '#000000',
                }}
              >
                +12 PTS
              </div>
            </div>
            <div className="mb-4">
              <span className="text-7xl font-bold text-black tracking-tighter">47%</span>
            </div>
            <div 
              className="w-full h-4 mb-3"
              style={{ backgroundColor: '#E5E5E5' }}
            >
              <div 
                className="h-4"
                style={{ 
                  width: '47%',
                  backgroundColor: '#2563EB',
                }}
              />
            </div>
            <p className="text-sm font-medium text-zinc-600">
              ABOVE INDUSTRY AVERAGE
            </p>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #000000',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest text-zinc-500">TREND</span>
              <div className="flex gap-1">
                {['7D', '30D', '90D'].map((period, i) => (
                  <button 
                    key={period}
                    className="px-3 py-1.5 text-xs font-bold"
                    style={{ 
                      backgroundColor: i === 0 ? '#000000' : '#FFFFFF',
                      color: i === 0 ? '#FFFFFF' : '#000000',
                      border: '2px solid #000000',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Bold bar chart */}
            <div className="h-48 flex items-end gap-2 pt-4">
              {[35, 38, 42, 40, 45, 43, 47, 44, 48, 46, 50, 47].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 relative group"
                  style={{ 
                    height: `${h * 2}%`,
                    backgroundColor: i === 11 ? '#2563EB' : '#E5E5E5',
                  }}
                >
                  {/* Hover value */}
                  <div 
                    className="absolute -top-6 left-1/2 -translate-x-1/2 px-1 text-xs font-bold opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
                  >
                    {h}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs font-bold text-zinc-400">
              <span>JAN</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
            </div>
          </div>

          {/* Metric cards with bold left borders */}
          <div 
            className="p-5"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #000000',
              borderLeft: '8px solid #2563EB',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-5 h-5" strokeWidth={2.5} style={{ color: '#2563EB' }} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">QUERIES</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">24</div>
            <div className="text-sm font-medium text-zinc-500">TRACKED</div>
          </div>

          <div 
            className="p-5"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #000000',
              borderLeft: '8px solid #84CC16',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5" strokeWidth={2.5} style={{ color: '#84CC16' }} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">MEMOS</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">3</div>
            <div className="text-sm font-medium text-zinc-500">PUBLISHED</div>
          </div>

          <div 
            className="p-5"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #000000',
              borderLeft: '8px solid #FF6B6B',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5" strokeWidth={2.5} style={{ color: '#FF6B6B' }} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">ALERTS</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">2</div>
            <div className="text-sm font-medium text-zinc-500">UNREAD</div>
          </div>
        </div>

        {/* Recent activity */}
        <div 
          className="mt-4 p-6"
          style={{ 
            backgroundColor: '#FFFFFF',
            border: '3px solid #000000',
          }}
        >
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 mb-4">RECENT ACTIVITY</h3>
          <div className="space-y-2">
            {[
              { action: 'SCAN COMPLETED', brand: 'Acme Corp', time: '2H AGO', color: '#2563EB' },
              { action: 'MEMO GENERATED', brand: 'Acme Corp', time: '1D AGO', color: '#84CC16' },
              { action: 'VISIBILITY ALERT', brand: 'Acme Corp', time: '2D AGO', color: '#FF6B6B' },
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3"
                style={{ 
                  backgroundColor: '#F5F5F5',
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-black">{item.action}</p>
                    <p className="text-xs font-medium text-zinc-500">{item.brand}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-zinc-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div 
          className="mt-4 p-6 flex items-center justify-between"
          style={{ 
            backgroundColor: '#000000',
          }}
        >
          <div>
            <h3 className="text-xl font-bold text-white">BOOST YOUR VISIBILITY</h3>
            <p className="text-zinc-400 font-medium">Generate AI-optimized content to rank higher</p>
          </div>
          <button 
            className="px-6 py-3 font-bold"
            style={{ 
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
            }}
          >
            GENERATE MEMO →
          </button>
        </div>
      </main>

      {/* Style label */}
      <div 
        className="fixed bottom-4 right-4 px-4 py-2 text-sm font-bold"
        style={{ 
          backgroundColor: '#000000',
          color: '#FFFFFF',
        }}
      >
        Style: Bold Marketing
      </div>
    </div>
  )
}
