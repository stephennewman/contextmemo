import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Users,
  Bot,
  Target,
  Sparkles,
  RefreshCw,
  Eye,
  LineChart,
  MessageSquare,
  Globe
} from "lucide-react";

// Pricing tranches - users lock in their price forever
const PRICING_TRANCHES = [
  { min: 1, max: 10, price: 0 },
  { min: 11, max: 25, price: 1 },
  { min: 26, max: 50, price: 3 },
  { min: 51, max: 100, price: 5 },
  { min: 101, max: 175, price: 9 },
  { min: 176, max: 275, price: 15 },
  { min: 276, max: 400, price: 19 },
  { min: 401, max: 575, price: 29 },
  { min: 576, max: 800, price: 39 },
  { min: 801, max: 1100, price: 49 },
  { min: 1101, max: 1500, price: 65 },
  { min: 1501, max: 2000, price: 79 },
  { min: 2001, max: Infinity, price: 99 },
];

function getCurrentTranche(userCount: number) {
  return PRICING_TRANCHES.find(t => userCount >= t.min && userCount <= t.max) || PRICING_TRANCHES[PRICING_TRANCHES.length - 1];
}

function getNextTranche(userCount: number) {
  const currentIndex = PRICING_TRANCHES.findIndex(t => userCount >= t.min && userCount <= t.max);
  if (currentIndex < PRICING_TRANCHES.length - 1) {
    return PRICING_TRANCHES[currentIndex + 1];
  }
  return null;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="font-semibold text-lg">Context Memo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="#features" className="text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Button asChild>
              <Link href="/signup">Start Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Bot className="h-4 w-4" />
            For B2B Marketing Teams
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
            Get your brand cited in <span className="text-primary">AI search results</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            Your buyers are asking ChatGPT, Claude, and Perplexity for product recommendations. 
            Context Memo ensures they hear about you.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          
          {/* AI Models Row */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="font-medium">Monitor visibility across:</span>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">ChatGPT</span>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">Claude</span>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">Perplexity</span>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">Gemini</span>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">Llama</span>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">Mistral</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">The New B2B Buyer Journey</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Your prospects have stopped Googling. They&apos;re asking AI for recommendations instead.
              If you&apos;re not in those answers, you&apos;re losing deals you never knew existed.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border text-center">
              <div className="text-4xl font-bold text-primary mb-2">65%</div>
              <p className="text-sm text-muted-foreground">
                of B2B buyers now use AI assistants for product research
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border text-center">
              <div className="text-4xl font-bold text-primary mb-2">3-5</div>
              <p className="text-sm text-muted-foreground">
                brands typically mentioned per AI recommendation
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border text-center">
              <div className="text-4xl font-bold text-primary mb-2">0</div>
              <p className="text-sm text-muted-foreground">
                clicks to your site if AI doesn&apos;t mention you
              </p>
            </div>
          </div>
          
          <div className="mt-12 max-w-3xl mx-auto bg-white dark:bg-zinc-800 p-6 rounded-lg border">
            <p className="text-lg text-center italic text-muted-foreground">
              &quot;What CRM is best for small B2B teams?&quot;
            </p>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              When your buyer asks this, does the AI mention your brand?
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Everything You Need for AI Visibility</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Track, analyze, and improve how AI models talk about your brand.
            </p>
          </div>
          
          {/* Main Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            {/* Feature 1: Multi-Model Scanning */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">6 AI Model Scanning</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Daily visibility checks across ChatGPT, Claude, Perplexity, Gemini, Llama, and Mistral. 
                Know exactly where you&apos;re mentioned and where you&apos;re not.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Automated daily scans</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Visibility score tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Historical trend analysis</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 2: Competitive Intelligence */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Competitive Intelligence</h3>
              <p className="text-muted-foreground text-sm mb-4">
                See which competitors win AI recommendations over you. 
                Get share-of-voice metrics and identify exactly which queries to improve.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Share of voice tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Win/loss analysis vs competitors</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Query gap identification</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 3: Auto-Generated Memos */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Auto-Generated Memos</h3>
              <p className="text-muted-foreground text-sm mb-4">
                AI creates factual, citable content based on your website. 
                Comparison pages, industry guides, how-tos—all optimized for AI citation.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>5 memo types generated</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Brand tone customization</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Auto internal linking</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 4: Search Console Integration */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <LineChart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Search Console Integration</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Connect Bing (ChatGPT&apos;s data source) and Google (AI Overviews) to see the 
                full picture of your AI discoverability pathway.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Bing Webmaster integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Google Search Console</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Query correlation insights</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 5: Competitor Content Response */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Competitor Content Intelligence</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Monitor competitor blogs daily. When they publish educational content, 
                automatically generate your response—in your brand&apos;s voice.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Daily competitor scanning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Smart content filtering</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Auto-publish responses</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 6: Persona Targeting */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Persona-Based Targeting</h3>
              <p className="text-muted-foreground text-sm mb-4">
                AI analyzes your website to identify your target personas. Content is generated 
                specifically for B2B Marketers, Developers, Product Leaders, and more.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Auto persona detection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>6 B2B persona types</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Intent-matched queries</span>
                </li>
              </ul>
            </div>
            
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How Context Memo Works</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Set it up once. Get continuous AI visibility monitoring and content generation.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-8">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div className="flex-1 bg-white dark:bg-zinc-800 p-6 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">Connect Your Brand</h3>
                  <p className="text-muted-foreground text-sm">
                    Add your brand with a verified work email. We&apos;ll crawl your website and extract 
                    key facts: products, features, pricing, differentiators, and target personas.
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div className="flex-1 bg-white dark:bg-zinc-800 p-6 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">Discover Competitors & Queries</h3>
                  <p className="text-muted-foreground text-sm">
                    AI identifies your competitors and generates high-intent buyer queries. 
                    These are the exact questions your prospects ask AI assistants.
                  </p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div className="flex-1 bg-white dark:bg-zinc-800 p-6 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">Monitor Your Visibility</h3>
                  <p className="text-muted-foreground text-sm">
                    Daily scans across 6 AI models show your visibility score, competitor performance, 
                    and specific queries where you&apos;re winning or losing.
                  </p>
                </div>
              </div>
              
              {/* Step 4 */}
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
                  4
                </div>
                <div className="flex-1 bg-white dark:bg-zinc-800 p-6 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">Auto-Generate Winning Content</h3>
                  <p className="text-muted-foreground text-sm">
                    For queries where you&apos;re missing, Context Memo creates factual memos—comparison pages, 
                    industry guides, how-tos—that AI models can cite. All based on verified facts from your site.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Automation Note */}
            <div className="mt-12 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>Everything runs automatically—daily scans, weekly content refresh, continuous optimization</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Authenticity */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-4 mb-8">
              <Shield className="h-8 w-8 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-xl mb-2">The Authenticity Principle</h3>
                <p className="text-muted-foreground">
                  Context Memo only creates content based on facts from your website. 
                  No hallucinated claims. No fake testimonials. Just verified information 
                  structured for AI citation. Every claim is traceable to a source.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm">Only verified facts from your website</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm">Competitor info from public sources only</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm">Citations and sources on every memo</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm">&quot;Last verified&quot; timestamps</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Built for B2B Marketing Teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <div className="text-2xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">Demand Gen Leaders</h3>
              <p className="text-sm text-muted-foreground">
                Track AI as a discovery channel alongside SEO and paid. Understand where 
                buyers find you in the new AI-first research journey.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <div className="text-2xl mb-4">🎯</div>
              <h3 className="font-semibold mb-2">Product Marketers</h3>
              <p className="text-sm text-muted-foreground">
                See how AI positions you vs competitors. Identify messaging gaps where 
                competitors win recommendations over you.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <div className="text-2xl mb-4">✍️</div>
              <h3 className="font-semibold mb-2">Content Teams</h3>
              <p className="text-sm text-muted-foreground">
                Scale AI-optimized content without manual effort. Auto-generated memos 
                fill gaps and respond to competitor content automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Early Adopter Model */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Early Adopter Pricing</h2>
          <p className="text-muted-foreground mb-2 max-w-2xl mx-auto">
            Lock in your price forever. The earlier you sign up, the less you pay — for life.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Price increases as we grow. Your rate never changes.
          </p>
          
          {/* Pricing Tiers Visual */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-xs">
              {PRICING_TRANCHES.slice(0, 7).map((tranche, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-lg border ${i === 0 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-white dark:bg-zinc-800'}`}
                >
                  <div className="font-bold text-lg">
                    {tranche.price === 0 ? 'FREE' : `$${tranche.price}`}
                  </div>
                  <div className="text-muted-foreground">
                    /mo
                  </div>
                  <div className="mt-1 text-muted-foreground text-[10px]">
                    Users {tranche.min}-{tranche.max}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              {PRICING_TRANCHES.slice(7).map((tranche, i) => (
                <div 
                  key={i} 
                  className="p-3 rounded-lg border bg-white dark:bg-zinc-800"
                >
                  <div className="font-bold text-lg">${tranche.price}</div>
                  <div className="text-muted-foreground">/mo</div>
                  <div className="mt-1 text-muted-foreground text-[10px]">
                    {tranche.max === Infinity ? `${tranche.min}+` : `${tranche.min}-${tranche.max}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Max price caps at <span className="font-semibold">$99/month</span> — early supporters get the best deal.
          </p>
          
          {/* What's Included */}
          <div className="max-w-md mx-auto mb-8">
            <p className="font-medium mb-4">Everything included:</p>
            <div className="grid grid-cols-2 gap-3 text-sm text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>6 AI model scans</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Unlimited memos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Competitor tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Search console sync</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Daily automation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Content intelligence</span>
              </div>
            </div>
          </div>
          
          <Button size="lg" asChild>
            <Link href="/signup">
              Claim Your Spot
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-zinc-900 dark:bg-zinc-950 text-white">
        <div className="container mx-auto px-4 text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Start Getting Cited by AI</h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Your competitors are already showing up in AI recommendations. 
            Don&apos;t let them own the conversation about your category.
          </p>
          <Button size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100" asChild>
            <Link href="/signup">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 pb-28">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">Context Memo</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-foreground">Sign In</Link>
              <Link href="/signup" className="hover:text-foreground">Sign Up</Link>
              <Link href="/about/editorial" className="hover:text-foreground">Editorial Guidelines</Link>
              <a href="mailto:support@contextmemo.com" className="hover:text-foreground">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Context Memo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Sticky Pricing Bar */}
      <PricingBar currentUserCount={7} />
    </div>
  );
}

function PricingBar({ currentUserCount }: { currentUserCount: number }) {
  const currentTranche = getCurrentTranche(currentUserCount);
  const nextTranche = getNextTranche(currentUserCount);
  const spotsLeft = currentTranche.max - currentUserCount + 1;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 dark:bg-zinc-950 text-white border-t border-zinc-800 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Current Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-sm">
                <span className="font-bold text-green-400">{currentUserCount}</span>
                <span className="text-zinc-400"> brands signed up</span>
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-zinc-700" />
            <div className="text-sm">
              <span className="text-zinc-400">Current price: </span>
              <span className="font-bold text-white">
                {currentTranche.price === 0 ? 'FREE' : `$${currentTranche.price}/mo`}
              </span>
              <span className="text-green-400 font-medium"> for life</span>
            </div>
          </div>

          {/* Urgency + CTA */}
          <div className="flex items-center gap-4">
            {nextTranche && spotsLeft <= 10 && (
              <div className="text-sm">
                <span className="text-amber-400 font-semibold">{spotsLeft} spots left</span>
                <span className="text-zinc-400"> at this price</span>
              </div>
            )}
            {nextTranche && spotsLeft > 10 && (
              <div className="hidden md:block text-sm text-zinc-400">
                Next tier: <span className="text-zinc-300">${nextTranche.price}/mo</span> after brand #{currentTranche.max}
              </div>
            )}
            <Button size="sm" className="bg-white text-zinc-900 hover:bg-zinc-100" asChild>
              <Link href="/signup">
                Lock In {currentTranche.price === 0 ? 'Free' : `$${currentTranche.price}/mo`}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress bar showing full journey to 2000 users */}
        <div className="mt-3 hidden sm:block">
          <div className="flex items-center gap-0.5">
            {PRICING_TRANCHES.slice(0, -1).map((tranche, i) => {
              const isCurrentTranche = currentUserCount >= tranche.min && currentUserCount <= tranche.max;
              const isPastTranche = currentUserCount > tranche.max;
              const width = ((tranche.max - tranche.min + 1) / 2000) * 100;
              const fillPercent = isCurrentTranche 
                ? ((currentUserCount - tranche.min + 1) / (tranche.max - tranche.min + 1)) * 100
                : isPastTranche ? 100 : 0;
              const showLabel = true;
              
              return (
                <div 
                  key={i} 
                  className="relative group"
                  style={{ width: `${width}%` }}
                >
                  <div className={`h-2 rounded-sm overflow-hidden ${isPastTranche ? 'bg-green-600' : 'bg-zinc-700'}`}>
                    {isCurrentTranche && (
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${fillPercent}%` }}
                      />
                    )}
                  </div>
                  {showLabel && (
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] whitespace-nowrap ${isCurrentTranche ? 'text-green-400 font-medium' : isPastTranche ? 'text-green-600' : 'text-zinc-500'}`}>
                      {tranche.price === 0 ? 'FREE' : `$${tranche.price}`}
                    </div>
                  )}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-medium">{tranche.price === 0 ? 'FREE' : `$${tranche.price}/mo`}</div>
                    <div className="text-zinc-400">Brands {tranche.min}-{tranche.max}</div>
                  </div>
                </div>
              );
            })}
            <div className="text-[9px] text-zinc-500 ml-1">$99</div>
          </div>
          <div className="flex justify-end mt-4 text-[10px] text-zinc-500">
            <span>2,000 brands = max price</span>
          </div>
        </div>
      </div>
    </div>
  );
}
