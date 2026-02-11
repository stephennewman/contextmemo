import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Transparent pricing for the most comprehensive AI visibility platform. Starter, Growth, and Enterprise plans with generous early access discounts.',
  openGraph: {
    title: 'Pricing | Context Memo',
    description: 'Transparent pricing for the most comprehensive AI visibility platform. Generous discounts for early access members.',
    url: 'https://contextmemo.com/pricing',
  },
  alternates: {
    canonical: 'https://contextmemo.com/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
