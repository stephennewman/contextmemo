import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Context Memo — Seed Round',
  description: 'Investor pitch deck for Context Memo. The closed-loop AI visibility platform.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RaiseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
