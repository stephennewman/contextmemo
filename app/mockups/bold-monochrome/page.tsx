'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, Search, AlertCircle, Zap } from 'lucide-react'

export default function BoldMonochromeMockup() {
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
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </Link>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-40"
        style={{ 
          backgroundColor: '#000000',
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <Zap className="h-7 w-7 text-white" />
              <span className="font-bold text-xl tracking-tight text-white">CONTEXT MEMO</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide bg-white text-black"
              >
                DASHBOARD
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide text-zinc-400 hover:text-white"
              >
                BRANDS
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide text-zinc-400 hover:text-white"
              >
                SETTINGS
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-zinc-400 hover:text-white">
              <Bell className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="w-9 h-9 flex items-center justify-center bg-white text-black text-sm font-bold">
              SN
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold tracking-tight text-black">DASHBOARD</h1>
          <p className="text-zinc-500 font-medium mt-1">Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Large visibility card */}
          <div 
            className="md:col-span-1 p-8 bg-black text-white"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold tracking-widest text-zinc-500">VISIBILITY</span>
              <div className="px-2 py-1 text-xs font-bold bg-white text-black">
                +12 PTS
              </div>
            </div>
            <div className="mb-6">
              <span className="text-8xl font-bold tracking-tighter">47%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 mb-4">
              <div className="h-2 bg-white" style={{ width: '47%' }} />
            </div>
            <p className="text-sm font-medium text-zinc-500">
              ABOVE INDUSTRY AVERAGE
            </p>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6 bg-white"
            style={{ border: '2px solid #000000' }}
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
            
            {/* Minimal line chart */}
            <div className="h-48 relative">
              <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                <path
                  d="M0,120 L33,110 L66,95 L99,100 L132,85 L165,90 L198,75 L231,80 L264,65 L297,70 L330,55 L363,60 L400,50"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                />
                {/* Data points */}
                {[[0,120], [33,110], [66,95], [99,100], [132,85], [165,90], [198,75], [231,80], [264,65], [297,70], [330,55], [363,60], [400,50]].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={i === 12 ? 6 : 4}
                    fill={i === 12 ? '#000000' : '#FFFFFF'}
                    stroke="#000000"
                    strokeWidth="2"
                  />
                ))}
              </svg>
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
            className="p-6 bg-white"
            style={{ border: '2px solid #000000' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Search className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">PROMPTS</span>
            </div>
            <div className="text-6xl font-bold text-black tracking-tighter">24</div>
            <div className="text-sm font-medium text-zinc-500 mt-1">TRACKED</div>
          </div>

          <div 
            className="p-6 bg-white"
            style={{ border: '2px solid #000000' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">MEMOS</span>
            </div>
            <div className="text-6xl font-bold text-black tracking-tighter">3</div>
            <div className="text-sm font-medium text-zinc-500 mt-1">PUBLISHED</div>
          </div>

          <div 
            className="p-6 bg-white"
            style={{ border: '2px solid #000000' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-xs font-bold tracking-widest text-zinc-500">ALERTS</span>
            </div>
            <div className="text-6xl font-bold text-black tracking-tighter">2</div>
            <div className="text-sm font-medium text-zinc-500 mt-1">UNREAD</div>
          </div>
        </div>

        {/* Recent activity */}
        <div 
          className="mt-4 p-6 bg-white"
          style={{ border: '2px solid #000000' }}
        >
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 mb-4">RECENT ACTIVITY</h3>
          <div className="space-y-0">
            {[
              { action: 'SCAN COMPLETED', brand: 'Acme Corp', time: '2H AGO' },
              { action: 'MEMO GENERATED', brand: 'Acme Corp', time: '1D AGO' },
              { action: 'VISIBILITY ALERT', brand: 'Acme Corp', time: '2D AGO' },
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between py-4"
                style={{ borderTop: i > 0 ? '1px solid #E5E5E5' : 'none' }}
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
        <div className="mt-4 p-8 bg-black flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">BOOST YOUR VISIBILITY</h3>
            <p className="text-zinc-500 font-medium">Generate AI-optimized content to rank higher</p>
          </div>
          <button className="px-8 py-4 font-bold bg-white text-black hover:bg-zinc-100">
            GENERATE MEMO →
          </button>
        </div>
      </main>

      {/* Style label */}
      <div className="fixed bottom-4 right-4 px-4 py-2 text-sm font-bold bg-black text-white">
        Style: Bold Monochrome
      </div>
    </div>
  )
}
