import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white" data-testid="auth-layout-main-div">
      {/* Bold Electric Header */}
      <header className="bg-[#0F172A] py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-[#0EA5E9]" />
            <span className="font-bold text-xl tracking-tight text-white">CONTEXT MEMO</span>
          </Link>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12" data-testid="auth-layout-content-area">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
