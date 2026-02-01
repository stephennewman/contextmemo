'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, Search, AlertCircle, Zap, TrendingUp, ChevronRight } from 'lucide-react'

export default function BoldSportMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#0A0A0A',
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold"
          style={{
            backgroundColor: '#00FF87',
            color: '#0A0A0A',
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
          backgroundColor: '#0A0A0A',
          borderBottom: '1px solid #222',
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 flex items-center justify-center -skew-x-6"
                style={{ backgroundColor: '#00FF87' }}
              >
                <Zap className="h-5 w-5 skew-x-6" style={{ color: '#0A0A0A' }} />
              </div>
              <span className="font-bold text-xl tracking-tight text-white italic">CONTEXT MEMO</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-bold tracking-wide -skew-x-3"
                style={{ 
                  backgroundColor: '#00FF87',
                  color: '#0A0A0A',
                }}
              >
                <span className="skew-x-3 inline-block">DASHBOARD</span>
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-bold tracking-wide text-zinc-500 hover:text-white"
              >
                BRANDS
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-bold tracking-wide text-zinc-500 hover:text-white"
              >
                SETTINGS
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-zinc-500 hover:text-white">
              <Bell className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div 
              className="w-9 h-9 flex items-center justify-center text-sm font-bold -skew-x-6"
              style={{ backgroundColor: '#00FF87', color: '#0A0A0A' }}
            >
              <span className="skew-x-6">SN</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 
            className="text-5xl font-bold tracking-tight text-white italic"
            style={{ 
              WebkitTextStroke: '1px #00FF87',
            }}
          >
            DASHBOARD
          </h1>
          <p className="text-zinc-500 font-medium mt-1">Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Large visibility card - HERO */}
          <div 
            className="md:col-span-1 p-6 relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #00FF87 0%, #00CC6A 100%)',
            }}
          >
            {/* Diagonal stripes */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)',
              }}
            />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest text-black/60">VISIBILITY</span>
                <div className="flex items-center gap-1 px-2 py-1 bg-black text-white text-xs font-bold">
                  <TrendingUp className="w-3 h-3" />
                  +12
                </div>
              </div>
              <div className="mb-4">
                <span 
                  className="text-8xl font-bold tracking-tighter italic"
                  style={{ color: '#0A0A0A' }}
                >
                  47<span className="text-5xl">%</span>
                </span>
              </div>
              <div className="w-full h-3 bg-black/20 mb-3 -skew-x-6">
                <div className="h-3 bg-black -skew-x-0" style={{ width: '47%' }} />
              </div>
              <p className="text-sm font-bold text-black/70 uppercase">
                Crushing the competition
              </p>
            </div>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6"
            style={{ 
              backgroundColor: '#141414',
              border: '1px solid #222',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest text-zinc-500">PERFORMANCE TREND</span>
              <div className="flex gap-1">
                {['7D', '30D', '90D'].map((period, i) => (
                  <button 
                    key={period}
                    className="px-3 py-1.5 text-xs font-bold -skew-x-3"
                    style={{ 
                      backgroundColor: i === 0 ? '#00FF87' : 'transparent',
                      color: i === 0 ? '#0A0A0A' : '#71717A',
                      border: i === 0 ? 'none' : '1px solid #333',
                    }}
                  >
                    <span className="skew-x-3 inline-block">{period}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Angled bar chart */}
            <div className="h-48 flex items-end gap-1 pt-4">
              {[35, 38, 42, 40, 45, 43, 47, 44, 48, 46, 50, 47].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 relative group -skew-x-6"
                  style={{ 
                    height: `${h * 2}%`,
                    backgroundColor: i === 11 ? '#00FF87' : '#222',
                    boxShadow: i === 11 ? '0 0 30px rgba(0, 255, 135, 0.3)' : 'none',
                  }}
                >
                  <div 
                    className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 skew-x-6"
                    style={{ backgroundColor: '#00FF87', color: '#0A0A0A' }}
                  >
                    {h}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs font-bold text-zinc-600">
              <span>JAN</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
            </div>
          </div>

          {/* Metric cards */}
          {[
            { label: 'QUERIES', value: '24', sub: 'TRACKED', icon: Search },
            { label: 'MEMOS', value: '3', sub: 'PUBLISHED', icon: FileText },
            { label: 'ALERTS', value: '2', sub: 'UNREAD', icon: AlertCircle },
          ].map((item, i) => (
            <div 
              key={i}
              className="p-5 relative overflow-hidden group cursor-pointer"
              style={{ 
                backgroundColor: '#141414',
                border: '1px solid #222',
              }}
            >
              {/* Hover accent */}
              <div 
                className="absolute top-0 left-0 w-1 h-full transition-all group-hover:w-full group-hover:opacity-10"
                style={{ backgroundColor: '#00FF87', opacity: 1 }}
              />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="w-5 h-5" strokeWidth={2.5} style={{ color: '#00FF87' }} />
                  <span className="text-xs font-bold tracking-widest text-zinc-500">{item.label}</span>
                </div>
                <div 
                  className="text-5xl font-bold tracking-tighter italic"
                  style={{ color: '#FFFFFF' }}
                >
                  {item.value}
                </div>
                <div className="text-sm font-bold text-zinc-600">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick stats ticker */}
        <div 
          className="mt-4 p-4 flex items-center justify-between overflow-hidden"
          style={{ 
            backgroundColor: '#141414',
            border: '1px solid #222',
          }}
        >
          <div className="flex items-center gap-8">
            {[
              { label: 'AVG POSITION', value: '#3' },
              { label: 'MENTIONS TODAY', value: '12' },
              { label: 'TOP QUERY', value: '"best tools"' },
              { label: 'WIN RATE', value: '67%' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-600">{stat.label}</span>
                <span className="text-sm font-bold text-white">{stat.value}</span>
                {i < 3 && <div className="w-px h-4 bg-zinc-700" />}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div 
          className="mt-4 p-6 flex items-center justify-between relative overflow-hidden -skew-x-3"
          style={{ backgroundColor: '#00FF87' }}
        >
          <div className="skew-x-3">
            <h3 className="text-2xl font-bold text-black italic">LEVEL UP YOUR VISIBILITY</h3>
            <p className="text-black/60 font-bold">Generate AI-optimized content to dominate rankings</p>
          </div>
          <button 
            className="px-6 py-3 font-bold flex items-center gap-2 skew-x-3 group"
            style={{ backgroundColor: '#0A0A0A', color: '#00FF87' }}
          >
            GENERATE MEMO 
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </main>

      {/* Style label */}
      <div 
        className="fixed bottom-4 right-4 px-4 py-2 text-sm font-bold -skew-x-6"
        style={{ backgroundColor: '#00FF87', color: '#0A0A0A' }}
      >
        <span className="skew-x-6 inline-block">Style: Bold Sport</span>
      </div>
    </div>
  )
}
