'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, Search, AlertCircle, Zap, TrendingUp } from 'lucide-react'

export default function BoldMultiMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#FAFAFA',
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

      {/* Header - gradient accent line */}
      <header 
        className="sticky top-0 z-40"
        style={{ 
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Gradient top bar */}
        <div 
          className="h-1"
          style={{ 
            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899, #F59E0B)',
          }}
        />
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 border-b border-zinc-200">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <Zap className="h-7 w-7" style={{ color: '#3B82F6' }} />
              <span className="font-bold text-xl tracking-tight text-black">CONTEXT MEMO</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide bg-black text-white"
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
            <button className="p-2 text-zinc-600 hover:text-black hover:bg-zinc-100">
              <Bell className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold bg-black">
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
          {/* Large visibility card - gradient background */}
          <div 
            className="md:col-span-1 p-6"
            style={{ 
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              color: '#FFFFFF',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest text-white/70">VISIBILITY</span>
              <div 
                className="px-2 py-1 text-xs font-bold flex items-center gap-1"
                style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
              >
                <TrendingUp className="w-3 h-3" />
                +12 PTS
              </div>
            </div>
            <div className="mb-4">
              <span className="text-7xl font-bold tracking-tighter">47%</span>
            </div>
            <div 
              className="w-full h-4 mb-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            >
              <div 
                className="h-4"
                style={{ width: '47%', backgroundColor: '#FFFFFF' }}
              />
            </div>
            <p className="text-sm font-medium text-white/80">
              ABOVE INDUSTRY AVERAGE
            </p>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6 bg-white"
            style={{ border: '2px solid #E5E5E5' }}
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
            
            {/* Multi-color gradient bars */}
            <div className="h-48 flex items-end gap-2 pt-4">
              {[35, 38, 42, 40, 45, 43, 47, 44, 48, 46, 50, 47].map((h, i) => {
                const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#C026D3', '#DB2777', '#EC4899', '#F472B6', '#F59E0B', '#EAB308', '#84CC16', '#22C55E']
                return (
                  <div 
                    key={i} 
                    className="flex-1 relative group"
                    style={{ 
                      height: `${h * 2}%`,
                      backgroundColor: i === 11 ? colors[i] : '#E5E5E5',
                      background: i === 11 ? `linear-gradient(180deg, ${colors[i]}, ${colors[(i + 2) % 12]})` : '#E5E5E5',
                    }}
                  >
                    <div 
                      className="absolute -top-6 left-1/2 -translate-x-1/2 px-1 text-xs font-bold opacity-0 group-hover:opacity-100"
                      style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
                    >
                      {h}%
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-3 text-xs font-bold text-zinc-400">
              <span>JAN</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
            </div>
          </div>

          {/* Metric cards - each with distinct saturated color */}
          <div 
            className="p-5 bg-white relative overflow-hidden"
            style={{ border: '2px solid #E5E5E5' }}
          >
            <div 
              className="absolute top-0 left-0 w-full h-1"
              style={{ backgroundColor: '#3B82F6' }}
            />
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: '#EFF6FF' }}
              >
                <Search className="w-4 h-4" strokeWidth={2.5} style={{ color: '#3B82F6' }} />
              </div>
              <span className="text-xs font-bold tracking-widest text-zinc-500">QUERIES</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">24</div>
            <div className="text-sm font-medium text-zinc-500">TRACKED</div>
          </div>

          <div 
            className="p-5 bg-white relative overflow-hidden"
            style={{ border: '2px solid #E5E5E5' }}
          >
            <div 
              className="absolute top-0 left-0 w-full h-1"
              style={{ backgroundColor: '#8B5CF6' }}
            />
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: '#F5F3FF' }}
              >
                <FileText className="w-4 h-4" strokeWidth={2.5} style={{ color: '#8B5CF6' }} />
              </div>
              <span className="text-xs font-bold tracking-widest text-zinc-500">MEMOS</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">3</div>
            <div className="text-sm font-medium text-zinc-500">PUBLISHED</div>
          </div>

          <div 
            className="p-5 bg-white relative overflow-hidden"
            style={{ border: '2px solid #E5E5E5' }}
          >
            <div 
              className="absolute top-0 left-0 w-full h-1"
              style={{ backgroundColor: '#EC4899' }}
            />
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: '#FDF2F8' }}
              >
                <AlertCircle className="w-4 h-4" strokeWidth={2.5} style={{ color: '#EC4899' }} />
              </div>
              <span className="text-xs font-bold tracking-widest text-zinc-500">ALERTS</span>
            </div>
            <div className="text-5xl font-bold text-black tracking-tighter">2</div>
            <div className="text-sm font-medium text-zinc-500">UNREAD</div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="mt-4 p-6 bg-white" style={{ border: '2px solid #E5E5E5' }}>
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 mb-4">RECENT ACTIVITY</h3>
          <div className="space-y-2">
            {[
              { action: 'SCAN COMPLETED', brand: 'Acme Corp', time: '2H AGO', color: '#3B82F6' },
              { action: 'MEMO GENERATED', brand: 'Acme Corp', time: '1D AGO', color: '#8B5CF6' },
              { action: 'VISIBILITY ALERT', brand: 'Acme Corp', time: '2D AGO', color: '#EC4899' },
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3 bg-zinc-50"
                style={{ borderLeft: `4px solid ${item.color}` }}
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

        {/* CTA Banner - gradient */}
        <div 
          className="mt-4 p-6 flex items-center justify-between"
          style={{ 
            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899)',
          }}
        >
          <div>
            <h3 className="text-xl font-bold text-white">BOOST YOUR VISIBILITY</h3>
            <p className="text-white/70 font-medium">Generate AI-optimized content to rank higher</p>
          </div>
          <button className="px-6 py-3 font-bold bg-white text-black hover:bg-zinc-100">
            GENERATE MEMO →
          </button>
        </div>
      </main>

      {/* Style label */}
      <div 
        className="fixed bottom-4 right-4 px-4 py-2 text-sm font-bold text-white"
        style={{ 
          background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
        }}
      >
        Style: Bold Multi
      </div>
    </div>
  )
}
