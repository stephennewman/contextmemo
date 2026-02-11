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
  LineChart,
  MessageSquare,
  FileText,
  TrendingUp,
  Shield,
  BookOpen,
  DollarSign,
  UserPlus,
  Briefcase,
  Trophy,
  BarChart3,
} from "lucide-react";

export default function Home() {

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Context Memo',
    url: 'https://contextmemo.com',
    description: 'AI visibility platform for B2B teams. Monitor, win, and prove ROI in ChatGPT, Claude, Perplexity, and Grok.',
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
    description: 'The premium AI visibility platform for B2B marketing teams. Track, analyze, and improve your brand presence in AI-powered search engines. The full closed loop from scan to revenue.',
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
            MONITOR, WIN, AND PROVE ROI IN{" "}
            <span className="text-[#0EA5E9]">AI SEARCH</span>
          </h1>
          
          <p className="mt-8 text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Track your brand across 4 AI models. 
            Generate content that gets cited. Verify it worked. 
            Attribute the revenue back to your CRM.
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
          </div>

          {/* Dashboard Mockup */}
          <div className="mt-20 max-w-5xl mx-auto relative">
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
                    <p className="text-[10px] text-emerald-400 font-bold tracking-wider mb-1.5">AI REVENUE</p>
                    <p className="text-4xl font-black text-emerald-400 leading-none">$47K</p>
                    <p className="text-[11px] text-slate-500 mt-2">3 deals attributed</p>
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
                      <p className="text-[10px] text-slate-600 font-semibold">4 models</p>
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
              <p className="text-2xl font-bold italic text-slate-700 mb-4">
                &quot;What&apos;s the best project management tool for small B2B teams?&quot;
              </p>
              <p className="text-slate-500">
                They don&apos;t Google it anymore. They ask ChatGPT, Claude, or Perplexity — and trust the first answer.
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

      {/* The Closed Loop — How It Works */}
      <section id="how-it-works" className="py-24 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">THE FULL CLOSED LOOP</h2>
            <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto">
              Most tools stop at monitoring. Context Memo closes the loop from discovery to revenue.
            </p>
          </div>
          
          <div className="grid md:grid-cols-5 gap-0 border-2 border-white/20">
            {/* Step 1 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-white/20">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                1
              </div>
              <h3 className="font-black text-lg mb-3">SCAN</h3>
              <p className="text-slate-400 text-sm">
                Recurring automated scans across ChatGPT, Claude, Perplexity, and Grok. See exactly where your brand gets cited — and where it doesn&apos;t.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-white/20">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                2
              </div>
              <h3 className="font-black text-lg mb-3">DISCOVER</h3>
              <p className="text-slate-400 text-sm">
                AI surfaces your real competitive landscape. Competitors, aggregators, publishers — all organically discovered from actual AI responses, not self-reported.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-white/20">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                3
              </div>
              <h3 className="font-black text-lg mb-3">GENERATE</h3>
              <p className="text-slate-400 text-sm">
                For every gap, we generate structured memos in your brand&apos;s voice. 9 content types built for how AI actually reads.
              </p>
            </div>
            
            {/* Step 4 */}
            <div className="p-6 lg:p-8 border-b-2 md:border-b-0 md:border-r-2 border-white/20">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                4
              </div>
              <h3 className="font-black text-lg mb-3">VERIFY</h3>
              <p className="text-slate-400 text-sm">
                24-72 hours after publish, we re-scan across 3 models to confirm your brand is now getting cited. Closed-loop proof, not guesswork.
              </p>
            </div>
            
            {/* Step 5 */}
            <div className="p-6 lg:p-8">
              <div className="w-14 h-14 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-xl mb-5">
                5
              </div>
              <h3 className="font-black text-lg mb-3">ATTRIBUTE</h3>
              <p className="text-slate-400 text-sm">
                Track AI-sourced traffic from 9 platforms. Match visitors to HubSpot contacts. Follow them through pipeline to closed-won revenue. Prove the ROI.
              </p>
            </div>
          </div>
          
          {/* Automation Note */}
          <div className="mt-8 flex items-center justify-center gap-3 text-slate-500 font-semibold">
            <RefreshCw className="h-5 w-5" />
            <span>RUNS AUTOMATICALLY — RECURRING SCANS, CONTINUOUS OPTIMIZATION, REVENUE PROOF</span>
          </div>
        </div>
      </section>

      {/* Features — Three Pillars */}
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
                  "Recurring scans across 4 AI models",
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

      {/* Revenue Attribution */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 text-[#0EA5E9] text-sm font-bold tracking-wide mb-6">
              <DollarSign className="h-4 w-4" />
              REVENUE ATTRIBUTION
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">FROM AI MENTION TO CLOSED DEAL</h2>
            <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto">
              The only platform that connects AI visibility to actual revenue.
            </p>
          </div>

          {/* Attribution Flow */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-16 text-sm font-bold">
            <span className="px-4 py-2 bg-white/10 border border-white/20">AI CITES YOUR BRAND</span>
            <ArrowRight className="h-4 w-4 text-[#0EA5E9] hidden sm:block" />
            <span className="px-4 py-2 bg-white/10 border border-white/20">VISITOR LANDS ON SITE</span>
            <ArrowRight className="h-4 w-4 text-[#0EA5E9] hidden sm:block" />
            <span className="px-4 py-2 bg-white/10 border border-white/20">MATCHED TO HUBSPOT</span>
            <ArrowRight className="h-4 w-4 text-[#0EA5E9] hidden sm:block" />
            <span className="px-4 py-2 bg-white/10 border border-white/20">PIPELINE INFLUENCED</span>
            <ArrowRight className="h-4 w-4 text-[#0EA5E9] hidden sm:block" />
            <span className="px-4 py-2 bg-[#0EA5E9] border border-[#0EA5E9]">REVENUE ATTRIBUTED</span>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-white/20">
            <div className="p-8 border-b-2 sm:border-b-2 lg:border-b-0 sm:border-r-2 lg:border-r-2 border-white/20">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">AI TRAFFIC SOURCES</h3>
              <p className="text-slate-400 text-sm">
                Track visitors from ChatGPT, Perplexity, Claude, Gemini, Copilot, Meta AI, Poe, You.com, and Phind. See exactly which AI platforms drive traffic.
              </p>
            </div>
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-white/20">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">CONTACT ATTRIBUTION</h3>
              <p className="text-slate-400 text-sm">
                AI visitors matched to HubSpot contacts automatically. Know which contacts discovered you through AI.
              </p>
            </div>
            <div className="p-8 border-b-2 sm:border-b-0 sm:border-r-2 lg:border-r-2 border-white/20">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">PIPELINE INFLUENCED</h3>
              <p className="text-slate-400 text-sm">
                Follow AI-sourced contacts through your sales pipeline. See deals influenced by AI visibility.
              </p>
            </div>
            <div className="p-8">
              <div className="w-12 h-12 bg-[#0EA5E9]/20 flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <h3 className="font-black text-lg mb-2">REVENUE CLOSED</h3>
              <p className="text-slate-400 text-sm">
                Attribute closed-won revenue back to AI as a channel. Report the number your CMO actually cares about.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="py-24 bg-[#0EA5E9]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">RELATIONSHIPS OVER REVENUE</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              We don&apos;t hand you a login and wish you luck. Every account is a design partnership — 
              we&apos;re building this with you, not just for you.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-0 border-2 border-white/30 mt-12">
            <div className="p-8 sm:p-10 border-b-2 sm:border-b-0 sm:border-r-2 border-white/30">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center mb-5">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3">PERSONALIZED ONBOARDING</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                We set up your brand, configure your competitive landscape, and run your first scan together. 
                No self-serve guesswork. You walk away understanding exactly where you stand.
              </p>
            </div>
            <div className="p-8 sm:p-10 border-b-2 sm:border-b-0 border-white/30">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center mb-5">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3">TEXT-BASED ACCESS</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                No ticket queues. No 3-day SLAs. You get direct access to the team — text us a question, 
                get an answer. We move at the speed you need.
              </p>
            </div>
            <div className="p-8 sm:p-10 border-t-0 sm:border-t-2 sm:border-r-2 border-white/30">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center mb-5">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3">INTIMATE FEEDBACK REVIEWS</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Your scan results aren&apos;t a dashboard you check alone. We walk through findings with you — 
                what&apos;s working, what&apos;s not, and what to do next.
              </p>
            </div>
            <div className="p-8 sm:p-10 border-t-2 border-white/30">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center mb-5">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3">DESIGN PARTNERSHIP</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Your feedback shapes the product. Early access members aren&apos;t just users — you&apos;re co-building 
                the platform with us. Features you request get prioritized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Memos Section */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">NOT ANOTHER BLOG POST</h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Memos aren&apos;t blog posts rewritten by AI. They&apos;re structured reference documents — 
              built for how AI models actually read, cite, and recommend. Every claim is cross-referenced 
              with your brand data. Every source is traceable. Every memo is verified.
            </p>
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

      {/* Use Cases */}
      <section className="py-24 bg-slate-100 text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">BUILT FOR B2B TEAMS</h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-[#0F172A]">
            <div className="p-8 border-b-2 sm:border-b-2 lg:border-b-0 sm:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <LineChart className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-lg mb-3">DEMAND GEN LEADERS</h3>
              <p className="text-slate-600 text-sm">
                Track AI as a revenue channel, not a vanity metric. See AI-sourced traffic, contacts, pipeline, and closed revenue in one dashboard.
              </p>
            </div>
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-lg mb-3">PRODUCT MARKETERS</h3>
              <p className="text-slate-600 text-sm">
                See how AI positions you vs. competitors in real time. Identify messaging gaps where competitors win recommendations you should own.
              </p>
            </div>
            <div className="p-8 border-b-2 sm:border-b-0 sm:border-r-2 border-[#0F172A]">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-lg mb-3">CONTENT TEAMS</h3>
              <p className="text-slate-600 text-sm">
                Replace the blog grind with structured, verifiable memos. 9 content types, auto-generated in your brand voice, built for AI discovery.
              </p>
            </div>
            <div className="p-8">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-lg mb-3">REVENUE OPS</h3>
              <p className="text-slate-600 text-sm">
                Attribute AI-sourced pipeline in HubSpot. Connect the dots from AI citation to closed-won deal. Give your CMO a number, not a theory.
              </p>
            </div>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold text-lg rounded-none px-10 py-6 h-auto">
              <Link href="/request-access">
                REQUEST EARLY ACCESS
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-2 border-white/20 hover:border-white/40 bg-transparent text-white font-bold text-lg rounded-none px-10 py-6 h-auto">
              <Link href="/pricing">
                VIEW FULL PRICING
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-[#0EA5E9]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Sparkles className="h-16 w-16 mx-auto mb-8" />
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">YOUR COMPETITORS ARE ALREADY IN AI RECOMMENDATIONS</h2>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
            You can monitor that. Or you can do something about it.
            Context Memo gives you the full closed loop — scan, discover, generate, verify, attribute.
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
                The AI visibility platform for B2B teams. Monitor, win, and prove ROI in AI search.
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
              The full closed loop for AI visibility.
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
