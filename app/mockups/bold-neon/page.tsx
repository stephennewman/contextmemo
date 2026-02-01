'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, Search, AlertCircle, Zap } from 'lucide-react'

export default function BoldNeonMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#09090B',
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
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
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
          backgroundColor: '#09090B',
          borderBottom: '1px solid #27272A',
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <Zap 
                className="h-7 w-7" 
                style={{ 
                  color: '#06B6D4',
                  filter: 'drop-shadow(0 0 8px #06B6D4)',
                }} 
              />
              <span 
                className="font-bold text-xl tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                CONTEXT MEMO
              </span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide"
                style={{ 
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  color: '#FFFFFF',
                }}
              >
                DASHBOARD
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide"
                style={{ color: '#71717A' }}
              >
                BRANDS
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-semibold tracking-wide"
                style={{ color: '#71717A' }}
              >
                SETTINGS
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button style={{ color: '#71717A' }}>
              <Bell className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div 
              className="w-9 h-9 flex items-center justify-center text-sm font-bold"
              style={{ 
                background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                color: '#FFFFFF',
              }}
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
          <h1 
            className="text-4xl font-bold tracking-tight"
            style={{ color: '#FAFAFA' }}
          >
            DASHBOARD
          </h1>
          <p style={{ color: '#71717A' }} className="font-medium">Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Large visibility card */}
          <div 
            className="md:col-span-1 p-6 relative overflow-hidden"
            style={{ 
              backgroundColor: '#18181B',
              border: '1px solid #27272A',
            }}
          >
            {/* Glow effect */}
            <div 
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', opacity: 0.2 }}
            />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest" style={{ color: '#71717A' }}>VISIBILITY</span>
                <div 
                  className="px-2 py-1 text-xs font-bold"
                  style={{ 
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    color: '#FFFFFF',
                  }}
                >
                  +12 PTS
                </div>
              </div>
              <div className="mb-4">
                <span 
                  className="text-7xl font-bold tracking-tighter"
                  style={{ 
                    background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.3))',
                  }}
                >
                  47%
                </span>
              </div>
              <div 
                className="w-full h-3 mb-3"
                style={{ backgroundColor: '#27272A' }}
              >
                <div 
                  className="h-3"
                  style={{ 
                    width: '47%',
                    background: 'linear-gradient(90deg, #06B6D4, #8B5CF6)',
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)',
                  }}
                />
              </div>
              <p className="text-sm font-medium" style={{ color: '#71717A' }}>
                ABOVE INDUSTRY AVERAGE
              </p>
            </div>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6"
            style={{ 
              backgroundColor: '#18181B',
              border: '1px solid #27272A',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest" style={{ color: '#71717A' }}>TREND</span>
              <div className="flex gap-1">
                {['7D', '30D', '90D'].map((period, i) => (
                  <button 
                    key={period}
                    className="px-3 py-1.5 text-xs font-bold"
                    style={{ 
                      background: i === 0 ? 'linear-gradient(135deg, #06B6D4, #8B5CF6)' : 'transparent',
                      color: i === 0 ? '#FFFFFF' : '#71717A',
                      border: i === 0 ? 'none' : '1px solid #27272A',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Neon bar chart */}
            <div className="h-48 flex items-end gap-2 pt-4">
              {[35, 38, 42, 40, 45, 43, 47, 44, 48, 46, 50, 47].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 relative group"
                  style={{ 
                    height: `${h * 2}%`,
                    background: i === 11 
                      ? 'linear-gradient(180deg, #06B6D4, #8B5CF6)' 
                      : '#27272A',
                    boxShadow: i === 11 ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none',
                  }}
                >
                  <div 
                    className="absolute -top-6 left-1/2 -translate-x-1/2 px-1 text-xs font-bold opacity-0 group-hover:opacity-100"
                    style={{ 
                      background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', 
                      color: '#FFFFFF' 
                    }}
                  >
                    {h}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs font-bold" style={{ color: '#52525B' }}>
              <span>JAN</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
            </div>
          </div>

          {/* Metric cards */}
          {[
            { label: 'PROMPTS', value: '24', sub: 'TRACKED', icon: Search, gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
            { label: 'MEMOS', value: '3', sub: 'PUBLISHED', icon: FileText, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
            { label: 'ALERTS', value: '2', sub: 'UNREAD', icon: AlertCircle, gradient: 'linear-gradient(135deg, #F43F5E, #E11D48)' },
          ].map((item, i) => (
            <div 
              key={i}
              className="p-5 relative overflow-hidden"
              style={{ 
                backgroundColor: '#18181B',
                border: '1px solid #27272A',
              }}
            >
              {/* Accent glow */}
              <div 
                className="absolute top-0 left-0 w-full h-1"
                style={{ 
                  background: item.gradient,
                  boxShadow: `0 0 20px ${i === 0 ? '#06B6D4' : i === 1 ? '#8B5CF6' : '#F43F5E'}40`,
                }}
              />
              <div className="flex items-center gap-3 mb-2">
                <item.icon 
                  className="w-5 h-5" 
                  strokeWidth={2.5} 
                  style={{ 
                    color: i === 0 ? '#06B6D4' : i === 1 ? '#8B5CF6' : '#F43F5E',
                    filter: `drop-shadow(0 0 4px ${i === 0 ? '#06B6D4' : i === 1 ? '#8B5CF6' : '#F43F5E'})`,
                  }} 
                />
                <span className="text-xs font-bold tracking-widest" style={{ color: '#71717A' }}>{item.label}</span>
              </div>
              <div className="text-5xl font-bold tracking-tighter" style={{ color: '#FAFAFA' }}>{item.value}</div>
              <div className="text-sm font-medium" style={{ color: '#52525B' }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div 
          className="mt-4 p-6 flex items-center justify-between relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
          }}
        >
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white">BOOST YOUR VISIBILITY</h3>
            <p className="text-white/70 font-medium">Generate AI-optimized content to rank higher</p>
          </div>
          <button 
            className="px-6 py-3 font-bold relative z-10"
            style={{ 
              backgroundColor: '#FFFFFF',
              color: '#09090B',
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
          background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
          color: '#FFFFFF',
        }}
      >
        Style: Bold Neon
      </div>
    </div>
  )
}
