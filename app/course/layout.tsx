import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Search Mastery Course | Context Memo',
  description: 'Master AI search optimization with our comprehensive course. Learn GEO, understand buyer behavior changes, and get actionable strategies for AI visibility.',
  openGraph: {
    title: 'AI Search Mastery Course | Context Memo',
    description: 'Master AI search optimization with our comprehensive course. Learn GEO, understand buyer behavior changes, and get actionable strategies for AI visibility.',
  },
}

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Course Header */}
      <header className="border-b-3 border-[#0F172A] bg-[#0F172A] text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/course" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0EA5E9] flex items-center justify-center font-bold text-sm">
              CM
            </div>
            <span className="font-semibold text-lg tracking-tight">AI Search Mastery</span>
          </a>
          <a
            href="https://contextmemo.com"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            by Context Memo
          </a>
        </div>
      </header>
      {children}
    </div>
  )
}
