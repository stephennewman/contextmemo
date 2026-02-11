import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing Calculator',
  description: 'Estimate your Context Memo cost based on competitors tracked, prompts monitored, and content generated. Usage-based pricing calculator.',
  openGraph: {
    title: 'Pricing Calculator | Context Memo',
    description: 'Estimate your AI visibility monitoring cost. Usage-based pricing calculator.',
    url: 'https://contextmemo.com/pricing/calculator',
  },
  alternates: {
    canonical: 'https://contextmemo.com/pricing/calculator',
  },
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return children
}
