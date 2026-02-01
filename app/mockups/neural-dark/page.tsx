'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, ChevronDown, TrendingUp, Search, AlertCircle, Sparkles } from 'lucide-react'

export default function NeuralDarkMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#0F172A',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
          linear-gradient(rgba(15, 23, 42, 0.9) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15, 23, 42, 0.9) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
      }}
    >
      {/* Back link */}
      <div className="fixed top-4 left-4 z-50">
        <Link 
          href="/mockups" 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            color: '#94A3B8',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to mockups
        </Link>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-40"
        style={{ 
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div 
                className="relative"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))',
                }}
              >
                <Sparkles className="h-6 w-6" style={{ color: '#06B6D4' }} />
              </div>
              <span 
                className="font-semibold text-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #06B6D4, #A855F7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Context Memo
              </span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ 
                  color: '#06B6D4',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                }}
              >
                Dashboard
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ color: '#64748B' }}
              >
                Brands
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ color: '#64748B' }}
              >
                Settings
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              className="p-2 rounded-lg"
              style={{ color: '#64748B' }}
            >
              <Bell className="h-5 w-5" />
            </button>
            <button 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ 
                  background: 'linear-gradient(135deg, #06B6D4, #A855F7)',
                }}
              >
                SN
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: '#64748B' }} />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 
            className="text-2xl font-bold"
            style={{ color: '#F1F5F9' }}
          >
            Dashboard
          </h1>
          <p style={{ color: '#64748B' }}>Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Large visibility card with gauge */}
          <div 
            className="md:col-span-1 p-6 rounded-2xl"
            style={{ 
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium" style={{ color: '#64748B' }}>VISIBILITY</span>
              <TrendingUp className="w-5 h-5" style={{ color: '#22C55E' }} />
            </div>
            
            {/* Circular gauge */}
            <div className="flex justify-center mb-6">
              <div className="relative w-36 h-36">
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${47 * 3.77} ${100 * 3.77}`}
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))',
                    }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span 
                    className="text-4xl font-bold"
                    style={{ 
                      color: '#F1F5F9',
                      textShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    47%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm">
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: '#22C55E',
                }}
              >
                ↑ 12%
              </span>
              <span style={{ color: '#64748B' }}>vs industry</span>
            </div>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6 rounded-2xl"
            style={{ 
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: '#64748B' }}>VISIBILITY TREND</span>
              <div className="flex gap-2">
                {['7D', '30D', '90D'].map((period, i) => (
                  <button 
                    key={period}
                    className="px-3 py-1 text-xs font-medium rounded-lg"
                    style={{ 
                      backgroundColor: i === 0 ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                      color: i === 0 ? '#06B6D4' : '#64748B',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Glowing chart */}
            <div className="h-48 flex items-end gap-1 pt-4 relative">
              {/* Glow effect */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, rgba(6, 182, 212, 0.1), transparent)',
                }}
              />
              {[35, 38, 42, 40, 45, 43, 47, 44, 48, 46, 50, 47].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 rounded-t relative"
                  style={{ 
                    height: `${h * 2}%`,
                    background: i === 11 
                      ? 'linear-gradient(180deg, #06B6D4, #A855F7)' 
                      : 'rgba(6, 182, 212, 0.3)',
                    boxShadow: i === 11 ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: '#475569' }}>
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
            </div>
          </div>

          {/* Metric cards */}
          {[
            { label: 'Queries', value: '24', sub: 'tracked', icon: Search, color: '#06B6D4' },
            { label: 'Memos', value: '3', sub: 'published', icon: FileText, color: '#A855F7' },
            { label: 'Alerts', value: '2', sub: 'unread', icon: AlertCircle, color: '#F97316' },
          ].map((item, i) => (
            <div 
              key={i}
              className="p-6 rounded-2xl"
              style={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    backgroundColor: `${item.color}20`,
                    boxShadow: `0 0 12px ${item.color}30`,
                  }}
                >
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: '#64748B' }}>{item.label}</span>
              </div>
              <div 
                className="text-3xl font-bold"
                style={{ color: '#F1F5F9' }}
              >
                {item.value}
              </div>
              <div className="text-sm" style={{ color: '#64748B' }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div 
          className="mt-6 p-6 rounded-2xl"
          style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h3 className="text-sm font-medium mb-4" style={{ color: '#64748B' }}>RECENT ACTIVITY</h3>
          <div className="space-y-4">
            {[
              { action: 'Scan completed', brand: 'Acme Corp', time: '2 hours ago', color: '#06B6D4' },
              { action: 'Memo generated', brand: 'Acme Corp', time: '1 day ago', color: '#A855F7' },
              { action: 'Visibility dropped', brand: 'Acme Corp', time: '2 days ago', color: '#F97316' },
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between py-2"
                style={{ borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.color}`,
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>{item.action}</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>{item.brand}</p>
                  </div>
                </div>
                <span className="text-xs" style={{ color: '#475569' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Style label */}
      <div 
        className="fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm font-medium"
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#F1F5F9',
        }}
      >
        Style: Neural Dark
      </div>
    </div>
  )
}
