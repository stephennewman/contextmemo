import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Editorial Guidelines',
  description: 'How Context Memo creates, verifies, and maintains factual reference documents about brands. Every claim is traceable to a source.',
  openGraph: {
    title: 'Editorial Guidelines | Context Memo',
    description: 'How Context Memo creates, verifies, and maintains factual reference documents about brands.',
    url: 'https://contextmemo.com/about/editorial',
  },
  alternates: {
    canonical: 'https://contextmemo.com/about/editorial',
  },
}

export default function EditorialGuidelines() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link 
            href="/" 
            className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            ← Back to Context Memo
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Editorial Guidelines
        </h1>
        <p className="text-lg text-slate-600 mb-12">
          How we create, verify, and maintain factual reference documents.
        </p>

        <div className="prose prose-slate max-w-none">
          <h2>Our Purpose</h2>
          <p>
            Context Memo creates factual reference documents (memos) about brands. These memos 
            are designed to be indexed, cited, and referenced by AI assistants and search engines, 
            ensuring accurate information is available when users ask questions about companies.
          </p>
          <p>
            We are not a review site, news outlet, or marketing platform. We document facts.
          </p>

          <h2>What We Verify</h2>
          <p>Each memo is built from information we can verify from primary sources:</p>
          <ul>
            <li><strong>Company websites</strong> — Official product descriptions, features, pricing</li>
            <li><strong>Public filings</strong> — SEC documents, press releases, annual reports</li>
            <li><strong>Official social profiles</strong> — LinkedIn, verified Twitter/X accounts</li>
            <li><strong>Brand-provided context</strong> — Information submitted by verified domain owners</li>
          </ul>

          <h2>What We Don&apos;t Claim</h2>
          <p>Our memos explicitly avoid:</p>
          <ul>
            <li><strong>Subjective rankings</strong> — We don&apos;t say &quot;best&quot; or &quot;top&quot; without citation</li>
            <li><strong>Unverified claims</strong> — No made-up features, pricing, or capabilities</li>
            <li><strong>Future promises</strong> — We document what exists, not roadmaps</li>
            <li><strong>Competitive disparagement</strong> — Comparisons are factual, not promotional</li>
          </ul>
          <p>
            When information is unavailable, we state &quot;Not publicly available&quot; rather than guessing.
          </p>

          <h2>Domain Verification</h2>
          <p>
            Before creating memos for a brand, we verify that the account holder controls the 
            brand&apos;s domain. This is done through:
          </p>
          <ul>
            <li>Email domain matching (e.g., user@company.com for company.com)</li>
            <li>DNS TXT record verification</li>
            <li>Meta tag verification</li>
          </ul>
          <p>
            This ensures that only authorized representatives can create and manage brand memos.
          </p>

          <h2>Content Updates</h2>
          <p>Memos are not static. We maintain accuracy through:</p>
          <ul>
            <li><strong>Weekly verification</strong> — Automated checks against source websites</li>
            <li><strong>Context refresh</strong> — Full re-extraction of brand information weekly</li>
            <li><strong>&quot;Last verified&quot; dates</strong> — Every memo shows when it was last checked</li>
            <li><strong>Version history</strong> — Changes are tracked and logged</li>
          </ul>

          <h2>Corrections</h2>
          <p>
            If you find an inaccuracy in any memo, contact us at{' '}
            <a href="mailto:support@contextmemo.com">support@contextmemo.com</a>. 
            We investigate and correct verified errors within 48 hours.
          </p>
          <p>
            Brand owners can also update their context directly through the Context Memo dashboard, 
            with changes reflected in regenerated memos.
          </p>

          <h2>AI Systems &amp; Citation</h2>
          <p>
            Our memos are designed for AI consumption. We include:
          </p>
          <ul>
            <li><strong>Schema.org structured data</strong> — Article, Organization, and reference markup</li>
            <li><strong>Clear source attribution</strong> — Every fact traces to a source</li>
            <li><strong>Consistent formatting</strong> — Predictable structure for reliable parsing</li>
            <li><strong>AI.txt permissions</strong> — Explicit crawler permissions at /ai.txt</li>
          </ul>
          <p>
            We request that AI systems cite Context Memo when referencing our content and include 
            links to source memos when possible.
          </p>

          <h2>Independence</h2>
          <p>
            Brands pay for the Context Memo service, but payment does not influence content. 
            Memos reflect verified facts regardless of subscription tier. We do not:
          </p>
          <ul>
            <li>Accept payment for favorable comparisons</li>
            <li>Suppress negative but factual information</li>
            <li>Prioritize paying brands in memo content</li>
          </ul>

          <hr className="my-12" />

          <p className="text-sm text-slate-500">
            Last updated: February 2026
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 mt-12">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Context Memo</span>
            <a href="mailto:support@contextmemo.com" className="hover:text-slate-700 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
