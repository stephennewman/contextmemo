import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Request Early Access',
  description: 'Request an invite code to join Context Memo. The invite-only AI visibility platform for B2B marketing teams. White-glove onboarding included.',
  openGraph: {
    title: 'Request Early Access | Context Memo',
    description: 'Request an invite code to join the invite-only AI visibility platform for B2B teams.',
    url: 'https://contextmemo.com/request-access',
  },
  alternates: {
    canonical: 'https://contextmemo.com/request-access',
  },
}

export default function RequestAccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
