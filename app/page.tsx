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
  BookOpen
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { CONTEXT_MEMO_BRAND_ID, getMemoUrl } from "@/lib/memo/render";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600 // ISR: regenerate at most once per hour

export default async function Home() {
  // Fetch featured memos for popular content section
  // Wrapped in try-catch with timeout so homepage still renders if DB is down
  let featuredMemos: { id: string; title: string; slug: string; memo_type: string; meta_description: string | null }[] | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const { data } = await supabase
      .from('memos')
      .select('id, title, slug, memo_type, meta_description')
      .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
      .eq('status', 'published')
      .eq('featured', true)
      .order('sort_order', { ascending: true })
      .limit(6)
      .abortSignal(controller.signal);
    clearTimeout(timeout);
    featuredMemos = data;
  } catch {
    // DB unavailable — render page without featured memos
    featuredMemos = null;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
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
            GET CITED IN{" "}
            <span className="text-[#0EA5E9]">AI SEARCH</span>
          </h1>
          
          <p className="mt-8 text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your buyers ask ChatGPT, Claude, and Perplexity for recommendations. 
            Make sure they hear about you.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold text-lg rounded-none px-8 py-6 h-auto">
              <Link href="/request-access">
                REQUEST EARLY ACCESS
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-2 border-white/20 hover:border-white/40 bg-transparent text-white font-bold text-lg rounded-none px-8 py-6 h-auto">
              <Link href="/pricing">VIEW PRICING</Link>
            </Button>
          </div>
          
          {/* AI Models Row */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm font-semibold text-slate-500 mr-2">MONITORS:</span>
            {["ChatGPT", "Claude", "Perplexity", "Gemini", "Llama", "Mistral"].map((model) => (
              <span key={model} className="px-4 py-2 bg-white/5 border border-white/10 text-sm font-semibold tracking-wide">
                {model.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">THE NEW BUYER JOURNEY</h2>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
              Your prospects stopped Googling. They ask AI instead.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-0 border-2 border-[#0F172A]">
            <div className="p-10 text-center border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="text-6xl md:text-7xl font-black text-[#0EA5E9]">65%</div>
              <p className="mt-4 text-lg font-semibold text-slate-600">
                of B2B buyers use AI for product research
              </p>
            </div>
            <div className="p-10 text-center border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="text-6xl md:text-7xl font-black text-[#0EA5E9]">3-5</div>
              <p className="mt-4 text-lg font-semibold text-slate-600">
                brands mentioned per AI recommendation
              </p>
            </div>
            <div className="p-10 text-center">
              <div className="text-6xl md:text-7xl font-black text-[#0EA5E9]">0</div>
              <p className="mt-4 text-lg font-semibold text-slate-600">
                clicks if AI doesn&apos;t mention you
              </p>
            </div>
          </div>
          
          <div className="mt-12 p-8 bg-slate-100 border-2 border-[#0F172A]">
            <p className="text-2xl md:text-3xl font-bold text-center italic text-slate-700">
              &quot;What&apos;s the best CRM for small B2B teams?&quot;
            </p>
            <p className="mt-4 text-center text-lg text-slate-500 font-semibold">
              When your buyer asks this, does AI mention your brand?
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">EVERYTHING YOU NEED</h2>
            <p className="mt-4 text-xl text-slate-400">
              Track, analyze, and improve your AI visibility.
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-2 border-white/20">
            
            {/* Feature 1 */}
            <div className="p-8 border-b-2 lg:border-r-2 border-white/20 group hover:bg-white/5 transition-colors">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Eye className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-3">6 AI MODEL SCANNING</h3>
              <p className="text-slate-400 mb-6">
                Daily visibility checks across ChatGPT, Claude, Perplexity, Gemini, Llama, and Mistral.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Automated daily scans
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Visibility score tracking
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Historical trends
                </li>
              </ul>
            </div>
            
            {/* Feature 2 */}
            <div className="p-8 border-b-2 lg:border-r-2 border-white/20 group hover:bg-white/5 transition-colors">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-3">COMPETITIVE INTELLIGENCE</h3>
              <p className="text-slate-400 mb-6">
                See which competitors win AI recommendations over you. Get share-of-voice metrics.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Share of voice tracking
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Win/loss analysis
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Query gap identification
                </li>
              </ul>
            </div>
            
            {/* Feature 3 */}
            <div className="p-8 border-b-2 border-white/20 group hover:bg-white/5 transition-colors">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-3">AUTO-GENERATED MEMOS</h3>
              <p className="text-slate-400 mb-6">
                Fresh, structured memos cross-referenced with your brand for accuracy. No hallucinations, no fluff.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  5 memo types
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Brand tone customization
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Auto internal linking
                </li>
              </ul>
            </div>
            
            {/* Feature 4 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-white/20 group hover:bg-white/5 transition-colors">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <LineChart className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-3">SEARCH CONSOLE SYNC</h3>
              <p className="text-slate-400 mb-6">
                Connect Bing and Google to see the full picture of your AI discoverability pathway.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Bing Webmaster integration
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Google Search Console
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Query correlation
                </li>
              </ul>
            </div>
            
            {/* Feature 5 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-white/20 group hover:bg-white/5 transition-colors">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-3">COMPETITIVE WATCH</h3>
              <p className="text-slate-400 mb-6">
                Monitor competitor activity daily. Auto-generate response memos in your brand&apos;s voice.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Daily competitor scanning
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Smart relevance filtering
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Auto-publish response memos
                </li>
              </ul>
            </div>
            
            {/* Feature 6 */}
            <div className="p-8 group hover:bg-white/5 transition-colors">
              <div className="w-14 h-14 bg-[#0EA5E9] flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-black text-xl tracking-tight mb-3">PERSONA TARGETING</h3>
              <p className="text-slate-400 mb-6">
                AI detects your target personas and generates memos specifically for each audience.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Auto persona detection
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  6 B2B persona types
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
                  Intent-matched queries
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">HOW IT WORKS</h2>
            <p className="mt-4 text-xl text-slate-600">
              Set it up once. Get continuous AI visibility.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-[#0F172A]">
            {/* Step 1 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-16 h-16 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-2xl mb-6">
                1
              </div>
              <h3 className="font-black text-lg mb-3">CONNECT YOUR BRAND</h3>
              <p className="text-slate-600">
                Verify with your work email. We crawl your site and extract key facts, features, and differentiators.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-16 h-16 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-2xl mb-6">
                2
              </div>
              <h3 className="font-black text-lg mb-3">DISCOVER LANDSCAPE</h3>
              <p className="text-slate-600">
                AI identifies your competitors and generates the high-intent queries your buyers actually ask.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-16 h-16 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-2xl mb-6">
                3
              </div>
              <h3 className="font-black text-lg mb-3">MONITOR VISIBILITY</h3>
              <p className="text-slate-600">
                Daily scans across 6 AI models show your score and where you&apos;re winning or losing vs competitors.
              </p>
            </div>
            
            {/* Step 4 */}
            <div className="p-8">
              <div className="w-16 h-16 bg-[#0EA5E9] text-white flex items-center justify-center font-black text-2xl mb-6">
                4
              </div>
              <h3 className="font-black text-lg mb-3">GENERATE MEMOS</h3>
              <p className="text-slate-600">
                For gaps, we generate structured memos cross-referenced with your brand data. Factual, citable, and built for how AI actually reads.
              </p>
            </div>
          </div>
          
          {/* Automation Note */}
          <div className="mt-8 flex items-center justify-center gap-3 text-slate-500 font-semibold">
            <RefreshCw className="h-5 w-5" />
            <span>RUNS AUTOMATICALLY — DAILY SCANS, WEEKLY REFRESH, CONTINUOUS OPTIMIZATION</span>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-start gap-6 mb-10">
            <div className="w-16 h-16 bg-[#0EA5E9] flex items-center justify-center shrink-0">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-black text-2xl tracking-tight mb-3">NOT ANOTHER BLOG POST</h3>
              <p className="text-xl text-slate-400">
                Memos are structured for how AI actually reads — fresh, properly formatted, and cross-referenced with your brand for accuracy. 
                No hallucinations. No filler. Every claim is traceable to a source.
              </p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Cross-referenced with your brand data",
              "Structured for people, AI, and search",
              "Transparent about AI generation",
              "Every claim traceable to a source"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-5 bg-white/5 border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-[#0EA5E9] shrink-0" />
                <span className="font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Content */}
      {featuredMemos && featuredMemos.length > 0 && (
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
              {featuredMemos.map((memo) => {
                const url = getMemoUrl(memo.slug, memo.memo_type);
                
                return (
                  <Link
                    key={memo.id}
                    href={url}
                    className="p-6 border-2 border-[#0F172A] group hover:bg-slate-50 hover:border-[#0EA5E9] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-4 w-4 text-[#0EA5E9]" />
                      <span className="text-xs font-bold text-[#0EA5E9] uppercase tracking-wide">
                        {memo.memo_type.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-black text-lg tracking-tight mb-3 group-hover:text-[#0EA5E9] transition-colors line-clamp-2">
                      {memo.title}
                    </h3>
                    {memo.meta_description && (
                      <p className="text-slate-600 text-sm line-clamp-2">
                        {memo.meta_description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-1 text-sm font-bold text-[#0EA5E9] opacity-0 group-hover:opacity-100 transition-opacity">
                      Read more <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
            
            <div className="mt-8 text-center">
              <Button asChild variant="outline" className="border-2 border-[#0F172A] hover:bg-[#0F172A] hover:text-white text-[#0F172A] font-bold rounded-none px-8">
                <Link href="/memos">
                  VIEW ALL MEMOS
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Use Cases */}
      <section className="py-24 bg-slate-100 text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">BUILT FOR B2B TEAMS</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-0 border-2 border-[#0F172A]">
            <div className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="text-5xl mb-6">📊</div>
              <h3 className="font-black text-xl mb-3">DEMAND GEN LEADERS</h3>
              <p className="text-slate-600">
                Track AI as a discovery channel alongside SEO and paid. Understand where buyers find you in the AI-first research journey.
              </p>
            </div>
            <div className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="text-5xl mb-6">🎯</div>
              <h3 className="font-black text-xl mb-3">PRODUCT MARKETERS</h3>
              <p className="text-slate-600">
                See how AI positions you vs competitors. Identify messaging gaps where competitors win recommendations.
              </p>
            </div>
            <div className="p-10">
              <div className="text-5xl mb-6">✍️</div>
              <h3 className="font-black text-xl mb-3">CONTENT TEAMS</h3>
              <p className="text-slate-600">
                Replace the blog grind with structured memos. Auto-generated, brand-accurate, and built for AI discovery.
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
            Transparent pricing. Generous discounts and flexibility for early access members.
          </p>
          
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-0 border-2 border-white/20 mb-10">
            <div className="p-8 border-b-2 md:border-b-0 md:border-r-2 border-white/20">
              <p className="text-sm font-bold text-slate-500 tracking-wider mb-3">STARTER</p>
              <div className="text-4xl font-black mb-1">$499</div>
              <p className="text-slate-500 text-sm font-semibold mb-6">/month</p>
              <ul className="space-y-3 text-left">
                {["50 prompts tracked", "3 AI models", "5 memos/month", "1 brand"].map((f, i) => (
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
                {["150 prompts tracked", "7 AI models + Overviews", "Unlimited memos", "3 brands", "Competitor intelligence"].map((f, i) => (
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
                {["Unlimited everything", "All AI models", "API access", "SSO/SAML", "Dedicated support"].map((f, i) => (
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
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">START GETTING CITED BY AI</h2>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
            Your competitors are already showing up in AI recommendations. 
            Don&apos;t let them own the conversation.
          </p>
          <Button size="lg" asChild className="bg-[#0F172A] hover:bg-[#0F172A]/90 text-white font-bold text-lg rounded-none px-10 py-6 h-auto">
            <Link href="/request-access">
              REQUEST EARLY ACCESS
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 pb-28 bg-[#0F172A] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-[#0EA5E9]" />
              <span className="font-black tracking-tight">CONTEXT MEMO</span>
            </div>
            <div className="flex items-center gap-8 text-sm font-semibold text-slate-400">
              <Link href="/memos" className="hover:text-white transition-colors">MEMOS</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">PRICING</Link>
              <Link href="/login" className="hover:text-white transition-colors">SIGN IN</Link>
            </div>
            <p className="text-sm text-slate-500 font-semibold">
              &copy; 2026 CONTEXT MEMO
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
