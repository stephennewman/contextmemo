'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, Search, AlertCircle, Flame } from 'lucide-react'

export default function BoldCoralMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#FFFBF5',
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            borderRadius: '4px',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </Link>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-40"
        style={{ 
          backgroundColor: '#FFFBF5',
          borderBottom: '3px solid #1A1A1A',
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <Flame className="h-7 w-7" style={{ color: '#FF6B35' }} />
              <span className="font-bold text-xl tracking-tight text-black">CONTEXT MEMO</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide"
                style={{ 
                  backgroundColor: '#FF6B35',
                  color: '#FFFFFF',
                }}
              >
                DASHBOARD
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide text-zinc-600 hover:text-black"
              >
                BRANDS
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide text-zinc-600 hover:text-black"
              >
                SETTINGS
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-zinc-600 hover:text-black">
              <Bell className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div 
              className="w-9 h-9 flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: '#FF6B35' }}
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
          <h1 className="text-4xl font-bold tracking-tight text-black">DASHBOARD</h1>
          <p className="text-zinc-500 font-medium">Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Large visibility card */}
          <div 
            className="md:col-span-1 p-6"
            style={{ 
              backgroundColor: '#FF6B35',
              color: '#FFFFFF',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest text-white/70">VISIBILITY</span>
              <div 
                className="px-2 py-1 text-xs font-bold"
                style={{ backgroundColor: '#FFFFFF', color: '#FF6B35' }}
              >
                +12 PTS
              </div>
            </div>
            <div className="mb-4">
              <span className="text-7xl font-bold tracking-tighter">47%</span>
            </div>
            <div className="w-full h-3 mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
              <div className="h-3 bg-white" style={{ width: '47%' }} />
            </div>
            <p className="text-sm font-medium text-white/80">
              ABOVE INDUSTRY AVERAGE
            </p>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #1A1A1A',
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
                      backgroundColor: i === 0 ? '#FF6B35' : '#FFFFFF',
                      color: i === 0 ? '#FFFFFF' : '#1A1A1A',
                      border: '2px solid #1A1A1A',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Bar chart with coral accent */}
            <div className="h-48 flex items-end gap-2 pt-4">
              {[35, 38, 42, 40, 45, 43, 47, 44, 48, 46, 50, 47].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 relative group"
                  style={{ 
                    height: `${h * 2}%`,
                    backgroundColor: i === 11 ? '#FF6B35' : '#FFE5D9',
                  }}
                >
                  <div 
                    className="absolute -top-6 left-1/2 -translate-x-1/2 px-1 text-xs font-bold opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: '#FF6B35', color: '#FFFFFF' }}
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

          {/* Metric cards */}
          <div 
            className="p-5"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #1A1A1A',
              borderLeft: '8px solid #FF6B35',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-5 h-5" strokeWidth={2.5} style={{ color: '#FF6B35' }} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">QUERIES</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">24</div>
            <div className="text-sm font-medium text-zinc-500">TRACKED</div>
          </div>

          <div 
            className="p-5"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #1A1A1A',
              borderLeft: '8px solid #F7C35F',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5" strokeWidth={2.5} style={{ color: '#F7C35F' }} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">MEMOS</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">3</div>
            <div className="text-sm font-medium text-zinc-500">PUBLISHED</div>
          </div>

          <div 
            className="p-5"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: '3px solid #1A1A1A',
              borderLeft: '8px solid #E63946',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5" strokeWidth={2.5} style={{ color: '#E63946' }} />
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
            border: '3px solid #1A1A1A',
          }}
        >
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 mb-4">RECENT ACTIVITY</h3>
          <div className="space-y-2">
            {[
              { action: 'SCAN COMPLETED', brand: 'Acme Corp', time: '2H AGO', color: '#FF6B35' },
              { action: 'MEMO GENERATED', brand: 'Acme Corp', time: '1D AGO', color: '#F7C35F' },
              { action: 'VISIBILITY ALERT', brand: 'Acme Corp', time: '2D AGO', color: '#E63946' },
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3"
                style={{ 
                  backgroundColor: '#FFF8F5',
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <div>
                  <p className="text-sm font-bold text-black">{item.action}</p>
                  <p className="text-xs font-medium text-zinc-500">{item.brand}</p>
                </div>
                <span className="text-xs font-bold text-zinc-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div 
          className="mt-4 p-6 flex items-center justify-between"
          style={{ backgroundColor: '#1A1A1A' }}
        >
          <div>
            <h3 className="text-xl font-bold text-white">BOOST YOUR VISIBILITY</h3>
            <p className="text-zinc-400 font-medium">Generate AI-optimized content to rank higher</p>
          </div>
          <button 
            className="px-6 py-3 font-bold"
            style={{ backgroundColor: '#FF6B35', color: '#FFFFFF' }}
          >
            GENERATE MEMO →
          </button>
        </div>
      </main>

      {/* Style label */}
      <div 
        className="fixed bottom-4 right-4 px-4 py-2 text-sm font-bold text-white"
        style={{ backgroundColor: '#FF6B35' }}
      >
        Style: Bold Coral
      </div>
    </div>
  )
}
