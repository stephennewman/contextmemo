import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Users,
  Bot,
  Target,
  Sparkles,
  RefreshCw,
  Eye,
  MessageSquare,
  FileText,
  TrendingUp,
  Shield,
  BookOpen,
  BarChart3,
} from "lucide-react";

export default function Home() {

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Context Memo',
    url: 'https://contextmemo.com',
    description: 'The autonomous AI visibility engine for B2B teams. Analyze your brand, deploy content on your domain, and verify AI is consuming it.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@contextmemo.com',
      contactType: 'customer support',
    },
  }

  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Context Memo',
    url: 'https://contextmemo.com',
    description: 'The autonomous AI visibility engine for B2B marketing teams. Analyze your brand, deploy white-labeled content on your domain, and verify AI is consuming it.',
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 bg-[#0F172A]/95 backdrop-blur-sm z-40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-[#0EA5E9]" />
            <span className="font-black text-xl tracking-tight">CONTEXT MEMO</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            <Link href="/memos" className="text-slate-400 hover:text-white transition-colors">MEMOS</Link>
            <Link href="#features" className="text-slate-400 hover:text-white transition-colors">FEATURES</Link>
            <Link href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">HOW IT WORKS</Link>
            <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">PRICING</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              SIGN IN
            </Link>
            <Button asChild className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold rounded-none px-6">
              <Link href="/request-access">REQUEST ACCESS</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0EA5E9]/10 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 text-[#0EA5E9] text-sm font-bold tracking-wide mb-8">
            <Bot className="h-4 w-4" />
            FOR B2B MARKETING TEAMS
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight max-w-5xl mx-auto leading-[0.9]">
            GET YOUR BRAND CITED IN{" "}
            <span className="text-[#0EA5E9]">AI SEARCH</span>
          </h1>
          
          <p className="mt-8 text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            We analyze your brand, discover where AI cites your competitors instead of you, 
            and continuously deploy white-labeled content on your domain to fill the gaps.
            Then we verify AI is consuming it.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold text-lg rounded-none px-8 py-6 h-auto">
              <Link href="/request-access">
                REQUEST EARLY ACCESS
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-2 border-white/20 hover:border-white/40 bg-transparent text-white font-bold text-lg rounded-none px-8 py-6 h-auto">
              <Link href="#how-it-works">SEE HOW IT WORKS</Link>
            </Button>
          </div>
          
          {/* AI Models Row */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm font-semibold text-slate-500 mr-2">MONITORS:</span>
            {["ChatGPT", "Claude", "Perplexity", "Grok"].map((model) => (
              <span key={model} className="px-4 py-2 bg-white/5 border border-white/10 text-sm font-semibold tracking-wide">
                {model.toUpperCase()}
              </span>
            ))}
            <span className="px-4 py-2 bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 text-sm font-semibold tracking-wide text-[#0EA5E9]">
              +MORE
            </span>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">AI IS THE NEW FIRST TOUCH</h2>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
              Your prospects stopped Googling. They ask AI instead.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-0 border-2 border-[#0F172A]">
            <div className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3">YOUR BUYER ASKS AI</h3>
              <p className="text-slate-600">
                Before they visit your site, before they read a review — they ask ChatGPT, Claude, or Perplexity. And they trust the first answer they get.
              </p>
            </div>
            <div className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3">AI RECOMMENDS 3-5 BRANDS</h3>
              <p className="text-slate-600">
                Each response mentions a handful of names. Your competitors are on the list. Are you?
              </p>
            </div>
            <div className="p-10">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Eye className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3">YOU HAVE NO VISIBILITY</h3>
              <p className="text-slate-600">
                No analytics. No attribution. No strategy. If AI doesn&apos;t cite you, your buyer never sees your name.
              </p>
            </div>
          </div>
          
          <div className="mt-12 p-8 bg-slate-100 border-2 border-[#0F172A]">
            <p className="text-2xl md:text-3xl font-bold text-center text-slate-700">
              <span className="text-[#0EA5E9] font-black">65%</span> of B2B buyers now use AI for product research.
            </p>
            <p className="mt-3 text-center text-lg text-slate-500 font-semibold">
              If AI doesn&apos;t mention you, you don&apos;t exist in their shortlist.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 text-[#0EA5E9] text-sm font-bold tracking-wide mb-6">
              <Zap className="h-4 w-4" />
              THE SOLUTION
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">AN AUTONOMOUS AI VISIBILITY ENGINE</h2>
            <p className="mt-4 text-xl text-slate-400 max-w-3xl mx-auto">
              We analyze your brand positioning, reverse-engineer the prompts that matter, map the competitive landscape AI actually sees, 
              and continuously deploy white-labeled content on your domain to fill the gaps. Then we verify AI is consuming it.
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className="max-w-5xl mx-auto relative">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-4 bg-[#0EA5E9]/8 blur-3xl rounded-3xl" />
            <div className="absolute -inset-1 bg-linear-to-b from-[#0EA5E9]/20 via-transparent to-[#0EA5E9]/5 rounded-xl" />
            
            <div className="relative bg-linear-to-b from-[#1E293B] to-[#162032] border border-white/15 rounded-xl overflow-hidden shadow-[0_20px_80px_-20px_rgba(14,165,233,0.3)]">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3 bg-[#0F172A]/80 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-5 py-1.5 bg-white/5 border border-white/5 rounded-md text-xs text-slate-500 font-mono">app.contextmemo.com/brands/acme-corp</div>
                </div>
                <div className="w-[52px]" /> {/* Spacer to center URL */}
              </div>
              
              {/* Dashboard content */}
              <div className="p-5 md:p-8">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-[#0EA5E9] to-[#0284C7] rounded-lg flex items-center justify-center shadow-lg shadow-[#0EA5E9]/20">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-lg leading-tight">ACME CORP</p>
                      <p className="text-xs text-slate-500">acmecorp.com</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-bold rounded-md border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      SCAN COMPLETE
                    </span>
                    <span className="text-xs text-slate-500">Today, 6:00 AM ET</span>
                  </div>
                </div>

                {/* Score + Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {/* Visibility Score - featured */}
                  <div className="bg-linear-to-br from-[#0EA5E9]/15 to-[#0EA5E9]/5 border border-[#0EA5E9]/25 p-4 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#0EA5E9]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <p className="text-[10px] text-[#0EA5E9] font-bold tracking-wider mb-1.5">VISIBILITY SCORE</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-[#0EA5E9] leading-none">72</p>
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-bold">+8</span>
                      </div>
                    </div>
                    {/* Mini sparkline */}
                    <div className="flex items-end gap-[3px] mt-3 h-6">
                      {[40, 35, 42, 45, 50, 48, 55, 58, 52, 60, 64, 72].map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-[#0EA5E9]"
                          style={{ height: `${(v / 72) * 100}%`, opacity: i === 11 ? 1 : 0.3 + (i * 0.05) }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-[#0F172A]/80 border border-white/8 p-4 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-bold tracking-wider mb-1.5">CITATION RATE</p>
                    <p className="text-4xl font-black text-white leading-none">64<span className="text-xl text-slate-400">%</span></p>
                    <p className="text-[11px] text-slate-500 mt-2">32 of 50 prompts</p>
                  </div>
                  
                  <div className="bg-[#0F172A]/80 border border-white/8 p-4 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-bold tracking-wider mb-1.5">MEMOS PUBLISHED</p>
                    <p className="text-4xl font-black text-white leading-none">18</p>
                    <div className="flex items-center gap-1 mt-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span className="text-[11px] text-emerald-400 font-semibold">12 verified cited</span>
                    </div>
                  </div>
                  
                  <div className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <p className="text-[10px] text-emerald-400 font-bold tracking-wider mb-1.5">AI TRAFFIC</p>
                    <p className="text-4xl font-black text-emerald-400 leading-none">847</p>
                    <p className="text-[11px] text-slate-500 mt-2">visits from AI this month</p>
                  </div>
                </div>

                {/* Prompt Results Table */}
                <div className="bg-[#0F172A]/60 border border-white/8 rounded-lg overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest">RECENT SCAN RESULTS</p>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {["GPT", "CLD", "PPX", "GRK"].map((m, i) => (
                          <div key={i} className="w-5 h-5 rounded-full bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 flex items-center justify-center">
                            <span className="text-[6px] font-bold text-[#0EA5E9]">{m}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 font-semibold">+more</p>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {/* Row 1 - 3/4 */}
                    <div className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-1.5 h-8 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-sm font-semibold truncate">&quot;Best CRM for small B2B teams&quot;</p>
                      </div>
                      <div className="hidden md:flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">GPT</span>
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">CLD</span>
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">PPX</span>
                        <span className="w-7 h-7 rounded bg-white/5 text-slate-600 text-[9px] font-bold flex items-center justify-center border border-white/5">GRK</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 shrink-0 tabular-nums">3/4</span>
                    </div>
                    {/* Row 2 - 4/4 */}
                    <div className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-1.5 h-8 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-sm font-semibold truncate">&quot;How to automate sales outreach&quot;</p>
                      </div>
                      <div className="hidden md:flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">GPT</span>
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">CLD</span>
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">PPX</span>
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">GRK</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 shrink-0 tabular-nums">4/4</span>
                    </div>
                    {/* Row 3 - 1/4 */}
                    <div className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-1.5 h-8 rounded-full bg-amber-400 shrink-0" />
                        <p className="text-sm font-semibold truncate">&quot;Acme Corp vs HubSpot for startups&quot;</p>
                      </div>
                      <div className="hidden md:flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded bg-amber-500/15 text-amber-400 text-[9px] font-bold flex items-center justify-center border border-amber-500/20">GPT</span>
                        <span className="w-7 h-7 rounded bg-white/5 text-slate-600 text-[9px] font-bold flex items-center justify-center border border-white/5">CLD</span>
                        <span className="w-7 h-7 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">PPX</span>
                        <span className="w-7 h-7 rounded bg-white/5 text-slate-600 text-[9px] font-bold flex items-center justify-center border border-white/5">GRK</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400 shrink-0 tabular-nums">1/4</span>
                    </div>
                    {/* Row 4 - Gap */}
                    <div className="px-5 py-3.5 flex items-center justify-between gap-4 bg-red-500/3 hover:bg-red-500/6 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-1.5 h-8 rounded-full bg-red-400 shrink-0" />
                        <p className="text-sm font-semibold truncate">&quot;Best pipeline management software 2026&quot;</p>
                      </div>
                      <div className="hidden md:flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded bg-red-500/15 text-red-400 text-[9px] font-bold flex items-center justify-center border border-red-500/20">GPT</span>
                        <span className="w-7 h-7 rounded bg-red-500/15 text-red-400 text-[9px] font-bold flex items-center justify-center border border-red-500/20">CLD</span>
                        <span className="w-7 h-7 rounded bg-red-500/15 text-red-400 text-[9px] font-bold flex items-center justify-center border border-red-500/20">PPX</span>
                        <span className="w-7 h-7 rounded bg-red-500/15 text-red-400 text-[9px] font-bold flex items-center justify-center border border-red-500/20">GRK</span>
                      </div>
                      <span className="text-[11px] font-bold text-red-400 shrink-0 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        MEMO READY
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom gradient fade */}
              <div className="h-8 bg-linear-to-t from-[#0F172A] to-transparent -mt-8 relative z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section id="features" className="py-24 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">EVERYTHING YOU NEED TO OWN AI SEARCH</h2>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-0 border-2 border-[#0F172A]">
            
            {/* Pillar 1 */}
            <div className="p-8 lg:p-10 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Eye className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-2">VISIBILITY INTELLIGENCE</h3>
              <p className="text-slate-500 mb-6">
                Know exactly where you stand across AI search — every day, every model, every prompt.
              </p>
              <ul className="space-y-3">
                {[
                  "Recurring scans across multiple AI models",
                  "Visibility score with historical trend tracking",
                  "Per-prompt citation status and streak tracking",
                  "Win/loss alerts when you gain or lose citations",
                  "Daily digest email summarizing your last 24 hours",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-[#0EA5E9] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Pillar 2 */}
            <div className="p-8 lg:p-10 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-2">COMPETITIVE ENGINE</h3>
              <p className="text-slate-500 mb-6">
                See who wins when you lose. Understand why. Then generate content that flips the result.
              </p>
              <ul className="space-y-3">
                {[
                  "Organic competitor discovery from real AI responses",
                  "Share-of-voice and win/loss tracking vs. competitors",
                  "Citation insights — see which URLs competitors get cited for",
                  "Daily competitor content monitoring via RSS",
                  "Auto-generated response memos when competitors publish",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-[#0EA5E9] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Pillar 3 */}
            <div className="p-8 lg:p-10">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-2">CONTENT THAT GETS CITED</h3>
              <p className="text-slate-500 mb-6">
                Not another blog post. Structured memos built for how AI reads — factual, citable, and verified.
              </p>
              <ul className="space-y-3">
                {[
                  "9 content types: compare, alternative, how-to, guide, industry, insight, and more",
                  "Brand voice matching from your actual website content",
                  "Auto-publish to HubSpot as blog drafts",
                  "Instant search engine indexing via IndexNow",
                  "Every claim cross-referenced with your brand data",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-[#0EA5E9] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Verified AI Consumption */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 text-[#0EA5E9] text-sm font-bold tracking-wide mb-6">
              <Shield className="h-4 w-4" />
              VERIFIED RESULTS
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">PROOF THAT IT&apos;S WORKING</h2>
            <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto">
              We don&apos;t just deploy content and hope. We verify AI is consuming it — with timestamps, before/after data, and measurable outcomes.
            </p>
          </div>

          {/* Verification Flow */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-16 text-sm font-bold">
            <span className="px-4 py-2 bg-white/10 border border-white/20">MEMO DEPLOYED</span>
            <ArrowRight className="h-4 w-4 text-[#0EA5E9] hidden sm:block" />
            <span className="px-4 py-2 bg-white/10 border border-white/20">AI MODELS RE-SCANNED</span>
            <ArrowRight className="h-4 w-4 text-[#0EA5E9] hidden sm:block" />
            <span className="px-4 py-2 bg-white/10 border border-white/20">CITATION VERIFIED</span>
            <ArrowRight className="h-4 w-4 text-[#0EA5E9] hidden sm:block" />
            <span className="px-4 py-2 bg-[#0EA5E9] border border-[#0EA5E9]">AI CONSUMING YOUR CONTENT</span>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-white/20">
            <div className="p-8 border-b-2 sm:border-b-2 lg:border-b-0 sm:border-r-2 lg:border-r-2 border-white/20">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <RefreshCw className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">RE-SCAN AFTER DEPLOY</h3>
              <p className="text-slate-400 text-sm">
                24-72 hours after deployment, we re-scan across multiple AI models to check if your content is now being cited. Automated, not manual.
              </p>
            </div>
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-white/20">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">TIME-TO-CITATION</h3>
              <p className="text-slate-400 text-sm">
                Measure how long it takes from deployment to first verified citation. Track the speed of AI adoption for each memo.
              </p>
            </div>
            <div className="p-8 border-b-2 sm:border-b-0 sm:border-r-2 lg:border-r-2 border-white/20">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">BEFORE &amp; AFTER</h3>
              <p className="text-slate-400 text-sm">
                See visibility scores before and after memo deployment. Concrete proof that your content is moving the needle.
              </p>
            </div>
            <div className="p-8">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">AI TRAFFIC TRACKING</h3>
              <p className="text-slate-400 text-sm">
                Track visitors from ChatGPT, Perplexity, Claude, and more. See which AI platforms are sending traffic to your content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">HOW IT WORKS</h2>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
              Five steps — from brand analysis to continuous, autonomous content deployment.
            </p>
          </div>
          
          <div className="grid md:grid-cols-5 gap-0 border-2 border-[#0F172A]">
            {/* Step 1 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                1
              </div>
              <h3 className="font-black text-lg mb-3">ANALYZE</h3>
              <p className="text-slate-600 text-sm">
                We ingest your brand positioning — mission, messaging, tone, personality. This becomes the foundation for every piece of content. Every memo sounds like you.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                2
              </div>
              <h3 className="font-black text-lg mb-3">SCAN</h3>
              <p className="text-slate-600 text-sm">
                We reverse-engineer the prompts your buyers ask AI — across one model or nine, 50 prompts or 5,000. This creates the baseline: where you show up, where you don&apos;t, and who gets cited instead.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                3
              </div>
              <h3 className="font-black text-lg mb-3">MAP</h3>
              <p className="text-slate-600 text-sm">
                AI responses reveal your real competitive dynamics — competitors, aggregators, publishers winning citations. We classify each and identify the exact content gaps costing you visibility.
              </p>
            </div>
            
            {/* Step 4 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                4
              </div>
              <h3 className="font-black text-lg mb-3">DEPLOY</h3>
              <p className="text-slate-600 text-sm">
                White-labeled memos matching your brand&apos;s tone and design — deployed on your site via HubSpot, subdomain, or folder path. Your domain authority. Your trust signals.
              </p>
            </div>
            
            {/* Step 5 */}
            <div className="p-6 lg:p-8">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                5
              </div>
              <h3 className="font-black text-lg mb-3">MONITOR</h3>
              <p className="text-slate-600 text-sm">
                The engine doesn&apos;t stop. We monitor AI consumption, competitor activity, and results to continuously generate new memos — filling gaps as the landscape shifts. One memo a day or a hundred.
              </p>
            </div>
          </div>
          
          {/* Scale Note */}
          <div className="mt-8 p-6 bg-slate-100 border-2 border-[#0F172A] text-center">
            <p className="text-slate-700 font-bold">
              SCALE UP OR DOWN AS YOU NEED — 1 MODEL OR 9 · 50 PROMPTS OR 5,000 · 1 MEMO/DAY OR 100
            </p>
            <p className="text-slate-500 text-sm mt-2">Everything is controlled, configurable, and built around your consumption.</p>
          </div>
        </div>
      </section>

      {/* Memos Section */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">ENSURE AI GETS THE MEMO</h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              A blog post is written for people. A Memo is written for AI and people. 
              Structured, factual, citable — built so AI models can parse it, understand it, and recommend your brand. 
              Every claim is cross-referenced with your data. Every source is traceable. Every Memo is verified after publish.
            </p>
          </div>

          {/* Memo Mockup */}
          <div className="max-w-3xl mx-auto mb-16 relative">
            <div className="absolute -inset-4 bg-[#0EA5E9]/5 blur-3xl rounded-3xl" />
            <div className="relative bg-white rounded-xl overflow-hidden shadow-[0_20px_80px_-20px_rgba(14,165,233,0.2)] text-[#0F172A]">
              {/* Memo header bar */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#0EA5E9] rounded flex items-center justify-center">
                    <span className="text-white text-[9px] font-black">VS</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#0EA5E9] font-bold tracking-wider">COMPARISON MEMO</p>
                    <p className="text-xs text-slate-400">Published Feb 10, 2026 · Auto-generated</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    VERIFIED CITED
                  </span>
                </div>
              </div>

              {/* Memo content */}
              <div className="px-6 py-6">
                <h3 className="text-xl font-black tracking-tight mb-1">Acme Corp vs HubSpot for B2B Startups</h3>
                <p className="text-xs text-slate-400 mb-5">Targeting: &quot;acme corp vs hubspot&quot; · &quot;hubspot alternatives for startups&quot;</p>
                
                {/* Mini comparison table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
                  <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
                    <div className="px-4 py-2.5 text-[10px] font-bold text-slate-400 tracking-wider">FEATURE</div>
                    <div className="px-4 py-2.5 text-[10px] font-bold text-[#0EA5E9] tracking-wider text-center">ACME CORP</div>
                    <div className="px-4 py-2.5 text-[10px] font-bold text-slate-400 tracking-wider text-center">HUBSPOT</div>
                  </div>
                  {[
                    { feature: "Starting price", acme: "$29/mo", hub: "$800/mo", win: true },
                    { feature: "Setup time", acme: "Same day", hub: "2-4 weeks", win: true },
                    { feature: "Pipeline automation", acme: "Built-in", hub: "Add-on", win: true },
                    { feature: "Enterprise features", acme: "Growing", hub: "Mature", win: false },
                  ].map((row, i) => (
                    <div key={i} className={`grid grid-cols-3 border-b border-slate-100 last:border-0 ${row.win ? 'bg-emerald-50/30' : ''}`}>
                      <div className="px-4 py-2.5 text-xs text-slate-600 font-medium">{row.feature}</div>
                      <div className={`px-4 py-2.5 text-xs font-semibold text-center ${row.win ? 'text-emerald-600' : 'text-slate-500'}`}>{row.acme}</div>
                      <div className={`px-4 py-2.5 text-xs font-semibold text-center ${!row.win ? 'text-emerald-600' : 'text-slate-500'}`}>{row.hub}</div>
                    </div>
                  ))}
                </div>

                {/* Excerpt paragraph */}
                <div className="text-sm text-slate-600 leading-relaxed mb-5">
                  <p>
                    For B2B startups with lean teams, Acme Corp offers a faster path to value with lower upfront costs 
                    and built-in pipeline automation. HubSpot remains the stronger choice for enterprise-scale operations 
                    with complex workflows...
                  </p>
                </div>

                {/* Sources */}
                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-4">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-[#0EA5E9]" />
                    3 SOURCES VERIFIED
                  </span>
                  <span>·</span>
                  <span>BRAND VOICE MATCHED</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    RE-SCANNED 48H AFTER PUBLISH
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Memo Types Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[
              { 
                icon: "vs", 
                title: "COMPARISONS", 
                desc: "Side-by-side breakdowns of your brand vs. competitors. Structured so AI can recommend you when buyers ask \"X vs Y.\"",
              },
              { 
                icon: "alt", 
                title: "ALTERNATIVES", 
                desc: "Position your brand as the alternative. When buyers search for competitors, AI surfaces your memo instead.",
              },
              { 
                icon: "how", 
                title: "HOW-TO GUIDES", 
                desc: "Step-by-step guides that answer the questions your buyers actually ask. Built to be cited as the authoritative answer.",
              },
              { 
                icon: "ind", 
                title: "INDUSTRY MEMOS", 
                desc: "Landscape overviews for your market. AI uses these to understand where your brand fits in the bigger picture.",
              },
              { 
                icon: "gap", 
                title: "GAP FILLS", 
                desc: "Content created specifically for queries where competitors get cited and you don't. Targeted, surgical, effective.",
              },
              { 
                icon: "res", 
                title: "CITATION RESPONSES", 
                desc: "When a competitor gets cited with a specific URL, we analyze it and generate a strategic counter-memo in your voice.",
              },
            ].map((type, i) => (
              <div key={i} className="p-6 bg-white/5 border border-white/10 hover:border-[#0EA5E9]/30 hover:bg-white/[0.07] transition-all text-center">
                <div className="w-12 h-12 bg-[#0EA5E9]/15 border border-[#0EA5E9]/25 flex items-center justify-center mx-auto mb-4 rounded-lg">
                  <span className="text-[#0EA5E9] text-xs font-black tracking-wider">{type.icon.toUpperCase()}</span>
                </div>
                <h3 className="font-black text-base tracking-tight mb-2">{type.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{type.desc}</p>
              </div>
            ))}
          </div>

          {/* Quality Guarantees */}
          <div className="border-2 border-white/10 p-8 md:p-10">
            <div className="flex items-center justify-center gap-3 mb-8">
              <Shield className="h-6 w-6 text-[#0EA5E9]" />
              <h3 className="font-black text-xl tracking-tight">EVERY MEMO IS VERIFIED</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "Cross-referenced with your brand data",
                "Structured for people, AI, and search",
                "Transparent about AI generation",
                "Every claim traceable to a source",
                "Re-scanned 24-72h after publish",
                "Brand voice matched to your site",
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-center gap-3 p-4 bg-white/5">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9] shrink-0" />
                  <span className="text-sm font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Memos */}
      <section className="py-24 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 text-[#0EA5E9] text-sm font-bold tracking-wide mb-6">
              <TrendingUp className="h-4 w-4" />
              FEATURED MEMOS
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">LEARN AI VISIBILITY</h2>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to understand how AI search works and how to get your brand cited.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                type: "GUIDE",
                icon: <BookOpen className="h-4 w-4" />,
                title: "What is GEO (Generative Engine Optimization)? The Complete Guide",
                desc: "Complete guide to Generative Engine Optimization (GEO) — the practice of optimizing your brand to be discovered and cited by AI assistants.",
                href: "/guides/what-is-geo-generative-engine-optimization",
              },
              {
                type: "HOW TO",
                icon: <Sparkles className="h-4 w-4" />,
                title: "How to Get Your Brand Mentioned by ChatGPT: A Practical Guide",
                desc: "Practical guide for B2B brands on how to get mentioned by ChatGPT through content optimization, authority building, and AI-friendly structure.",
                href: "/guides/how-to-get-brand-mentioned-by-chatgpt",
              },
              {
                type: "COMPARISON",
                icon: <Target className="h-4 w-4" />,
                title: "Best AI Visibility Tools 2026: How to Track Brand Citations in ChatGPT, Claude, and Perplexity",
                desc: "Comparison of the best AI visibility tools in 2026 for tracking brand citations across AI models.",
                href: "/compare/best-ai-visibility-tools-2026",
              },
              {
                type: "COMPARISON",
                icon: <BarChart3 className="h-4 w-4" />,
                title: "GEO vs SEO: What Marketers Need to Know About AI Search Optimization",
                desc: "Complete comparison of GEO vs SEO — when to prioritize each, how they overlap, and practical recommendations for B2B marketers.",
                href: "/compare/geo-vs-seo-ai-search-optimization",
              },
              {
                type: "HOW TO",
                icon: <Eye className="h-4 w-4" />,
                title: "How to Optimize Content for Perplexity AI: Get Your Brand Cited",
                desc: "How Perplexity AI selects sources and practical steps to increase your brand citation rate in AI-powered search.",
                href: "/guides/how-to-optimize-content-for-perplexity-ai",
              },
              {
                type: "GUIDE",
                icon: <FileText className="h-4 w-4" />,
                title: "How to Optimize Your Site for LLM Training Data and AI Search",
                desc: "A practical guide to making your website citable by ChatGPT, Claude, Perplexity, and Gemini. Covers llms.txt, JSON-LD, and semantic HTML.",
                href: "/guides/optimize-site-for-llm-training-data-ai-search",
              },
            ].map((memo, i) => (
              <Link
                key={i}
                href={memo.href}
                className="p-6 border-2 border-[#0F172A] group hover:bg-slate-50 hover:border-[#0EA5E9] transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#0EA5E9]">{memo.icon}</span>
                  <span className="text-xs font-bold text-[#0EA5E9] uppercase tracking-wide">
                    {memo.type}
                  </span>
                </div>
                <h3 className="font-black text-lg tracking-tight mb-3 group-hover:text-[#0EA5E9] transition-colors line-clamp-2">
                  {memo.title}
                </h3>
                <p className="text-slate-600 text-sm line-clamp-2">
                  {memo.desc}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-bold text-[#0EA5E9] opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <Button asChild variant="outline" className="border-2 border-[#0F172A] hover:bg-[#0F172A] hover:text-white text-[#0F172A] font-bold rounded-none px-8">
              <Link href="/memos">
                VIEW ALL MEMOS
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">PREMIUM AI VISIBILITY</h2>
          <p className="text-xl text-slate-400 mb-12">
            Transparent pricing. Generous discounts for early access members.
          </p>
          
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-0 border-2 border-white/20 mb-10">
            <div className="p-8 border-b-2 md:border-b-0 md:border-r-2 border-white/20">
              <p className="text-sm font-bold text-slate-500 tracking-wider mb-3">STARTER</p>
              <div className="text-4xl font-black mb-1">$499</div>
              <p className="text-slate-500 text-sm font-semibold mb-6">/month</p>
              <ul className="space-y-3 text-left">
                {["50 prompts tracked", "2 AI models", "5 memos/month", "1 brand", "Daily digest email"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#0EA5E9] shrink-0" />
                    <span className="text-slate-400">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 border-b-2 md:border-b-0 md:border-r-2 border-white/20 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#0EA5E9]" />
              <p className="text-sm font-bold text-[#0EA5E9] tracking-wider mb-3">GROWTH</p>
              <div className="text-4xl font-black mb-1">$999</div>
              <p className="text-slate-500 text-sm font-semibold mb-6">/month</p>
              <ul className="space-y-3 text-left">
                {[
                  "150 prompts tracked", 
                  "4 AI models", 
                  "Unlimited memos", 
                  "3 brands", 
                  "Competitive intelligence",
                  "HubSpot integration",
                  "Revenue attribution",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#0EA5E9] shrink-0" />
                    <span className="text-slate-400">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8">
              <p className="text-sm font-bold text-slate-500 tracking-wider mb-3">ENTERPRISE</p>
              <div className="text-4xl font-black mb-1">CUSTOM</div>
              <p className="text-slate-500 text-sm font-semibold mb-6">talk to us</p>
              <ul className="space-y-3 text-left">
                {[
                  "Unlimited prompts and brands", 
                  "All AI models", 
                  "Dedicated support", 
                  "Custom onboarding",
                  "Priority feature requests",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#0EA5E9] shrink-0" />
                    <span className="text-slate-400">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Discount Banner */}
          <div className="border-2 border-[#0EA5E9] bg-[#0EA5E9]/10 p-6 mb-10">
            <p className="font-black text-lg mb-2">EARLY ACCESS PRICING</p>
            <p className="text-slate-400 text-sm">
              We offer generous discounts and pricing flexibility for early access members. Request access and tell us about your use case.
            </p>
          </div>

          {/* CTAs */}
          <Button size="lg" asChild className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold text-lg rounded-none px-10 py-6 h-auto">
            <Link href="/request-access">
              REQUEST EARLY ACCESS
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-[#0EA5E9]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Sparkles className="h-16 w-16 mx-auto mb-8" />
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">YOUR COMPETITORS ARE ALREADY IN AI RECOMMENDATIONS</h2>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
            You can monitor that. Or you can do something about it.
            Context Memo analyzes your brand, deploys content on your domain, and verifies AI is consuming it. Continuously.
          </p>
          <Button size="lg" asChild className="bg-[#0F172A] hover:bg-[#0F172A]/90 text-white font-bold text-lg rounded-none px-10 py-6 h-auto">
            <Link href="/request-access">
              REQUEST EARLY ACCESS
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="py-16 pb-28 bg-[#0F172A] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-7 w-7 text-[#0EA5E9]" />
                <span className="font-black text-lg tracking-tight">CONTEXT MEMO</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                The autonomous AI visibility engine for B2B teams. Analyze, deploy, and verify — on your domain.
              </p>
            </div>
            
            {/* Product */}
            <div>
              <h4 className="text-xs font-bold tracking-widest text-slate-400 mb-4">PRODUCT</h4>
              <ul className="space-y-3">
                <li><Link href="#features" className="text-sm text-slate-500 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-slate-500 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/changelog" className="text-sm text-slate-500 hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>
            
            {/* Resources */}
            <div>
              <h4 className="text-xs font-bold tracking-widest text-slate-400 mb-4">RESOURCES</h4>
              <ul className="space-y-3">
                <li><Link href="/memos" className="text-sm text-slate-500 hover:text-white transition-colors">Memos</Link></li>
                <li><Link href="/about/editorial" className="text-sm text-slate-500 hover:text-white transition-colors">Editorial Policy</Link></li>
                <li><Link href="/request-access" className="text-sm text-slate-500 hover:text-white transition-colors">Request Access</Link></li>
              </ul>
            </div>
            
            {/* Account */}
            <div>
              <h4 className="text-xs font-bold tracking-widest text-slate-400 mb-4">ACCOUNT</h4>
              <ul className="space-y-3">
                <li><Link href="/login" className="text-sm text-slate-500 hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/request-access" className="text-sm text-slate-500 hover:text-white transition-colors">Request Invite Code</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600 font-semibold">
              &copy; 2026 CONTEXT MEMO. ALL RIGHTS RESERVED.
            </p>
            <p className="text-xs text-slate-600">
              The autonomous AI visibility engine.
            </p>
          </div>
        </div>
      </footer>

      {/* Sticky Access Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t-2 border-[#0EA5E9] z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="font-bold text-lg">
                <span className="text-white">INVITE-ONLY</span>
                <span className="text-[#0EA5E9]"> · FLEXIBLE PRICING</span>
              </div>
            </div>
            <Button asChild className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold rounded-none px-6">
              <Link href="/request-access">
                REQUEST ACCESS
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
