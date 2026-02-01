'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Bell, ChevronDown, TrendingUp, Search, AlertCircle, Sparkles } from 'lucide-react'

export default function SoftModernMockup() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: '#F8FAFC',
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      {/* Google Font import */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      {/* Back link */}
      <div className="fixed top-4 left-4 z-50">
        <Link 
          href="/mockups" 
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-medium text-slate-600 hover:text-slate-900"
          style={{ borderRadius: '9999px' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to mockups
        </Link>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-40"
        style={{ 
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#8B5CF6' }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-slate-800">Context Memo</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-2">
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium"
                style={{ 
                  backgroundColor: '#F3E8FF',
                  color: '#7C3AED',
                  borderRadius: '9999px',
                }}
              >
                Dashboard
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                style={{ borderRadius: '9999px' }}
              >
                Brands
              </a>
              <a 
                href="#" 
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                style={{ borderRadius: '9999px' }}
              >
                Settings
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              style={{ borderRadius: '12px' }}
            >
              <Bell className="h-5 w-5" />
            </button>
            <button 
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100"
              style={{ borderRadius: '9999px' }}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #8B5CF6, #2DD4BF)',
                }}
              >
                SN
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500">Monitor your brand&apos;s AI search visibility</p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-5 md:grid-cols-3">
          {/* Large visibility card */}
          <div 
            className="md:col-span-1 p-6"
            style={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-slate-400">Visibility Score</span>
              <div 
                className="px-2 py-1 text-xs font-medium"
                style={{ 
                  backgroundColor: '#D1FAE5',
                  color: '#059669',
                  borderRadius: '8px',
                }}
              >
                +12%
              </div>
            </div>
            <div className="mb-5">
              <span 
                className="text-5xl font-bold"
                style={{ color: '#1E293B' }}
              >
                47%
              </span>
            </div>
            <div 
              className="w-full h-4 mb-3"
              style={{ 
                backgroundColor: '#F3E8FF',
                borderRadius: '9999px',
              }}
            >
              <div 
                className="h-4"
                style={{ 
                  width: '47%',
                  background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                  borderRadius: '9999px',
                }}
              />
            </div>
            <p className="text-sm text-slate-400">
              Great progress! You&apos;re above industry average.
            </p>
          </div>

          {/* Trend chart card */}
          <div 
            className="md:col-span-2 p-6"
            style={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400">Visibility Trend</span>
              <div 
                className="flex gap-1 p-1"
                style={{ 
                  backgroundColor: '#F1F5F9',
                  borderRadius: '10px',
                }}
              >
                {['7D', '30D', '90D'].map((period, i) => (
                  <button 
                    key={period}
                    className="px-3 py-1.5 text-xs font-medium"
                    style={{ 
                      backgroundColor: i === 0 ? '#FFFFFF' : 'transparent',
                      color: i === 0 ? '#8B5CF6' : '#64748B',
                      borderRadius: '8px',
                      boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Smooth curved chart */}
            <div className="h-48 relative">
              <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,40"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M0,120 Q50,100 100,90 T200,70 T300,50 T400,40 L400,150 L0,150 Z"
                  fill="url(#areaGradient)"
                />
              </svg>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
            </div>
          </div>

          {/* Metric cards with pastel backgrounds */}
          <div 
            className="p-5"
            style={{ 
              background: 'linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)',
              borderRadius: '20px',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="p-2.5"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                }}
              >
                <Search className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800">24</div>
            <div className="text-sm text-slate-500">Prompts tracked</div>
          </div>

          <div 
            className="p-5"
            style={{ 
              background: 'linear-gradient(135deg, #CCFBF1 0%, #D1FAE5 100%)',
              borderRadius: '20px',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="p-2.5"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                }}
              >
                <FileText className="w-5 h-5" style={{ color: '#14B8A6' }} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800">3</div>
            <div className="text-sm text-slate-500">Memos published</div>
          </div>

          <div 
            className="p-5"
            style={{ 
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              borderRadius: '20px',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="p-2.5"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                }}
              >
                <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800">2</div>
            <div className="text-sm text-slate-500">Alerts unread</div>
          </div>
        </div>

        {/* Recent activity */}
        <div 
          className="mt-5 p-6"
          style={{ 
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <h3 className="text-sm font-medium text-slate-400 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: 'Scan completed', brand: 'Acme Corp', time: '2 hours ago', bg: '#F3E8FF', color: '#8B5CF6' },
              { action: 'Memo generated', brand: 'Acme Corp', time: '1 day ago', bg: '#CCFBF1', color: '#14B8A6' },
              { action: 'Visibility alert', brand: 'Acme Corp', time: '2 days ago', bg: '#FEF3C7', color: '#F59E0B' },
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3"
                style={{ 
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3"
                    style={{ 
                      backgroundColor: item.color,
                      borderRadius: '6px',
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.action}</p>
                    <p className="text-xs text-slate-400">{item.brand}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Style label */}
      <div 
        className="fixed bottom-4 right-4 px-4 py-2 bg-white shadow-sm text-sm font-medium text-slate-600"
        style={{ borderRadius: '9999px' }}
      >
        Style: Soft Modern
      </div>
    </div>
  )
}
