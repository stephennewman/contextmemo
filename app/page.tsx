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
  Users
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="font-semibold text-lg">Context Memo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Zap className="h-4 w-4" />
            The future of marketing isn't Google
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Fill the gaps AI needs to cite you.
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            Automate factual, contextual reference memos about your brand that AI search engines can cite. 
            Improve your visibility in ChatGPT, Claude, Perplexity, and more, without any legwork.
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
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">AI Search is Replacing Google</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              When prospects ask ChatGPT or Claude about solutions like yours, 
              they get AI-generated answers. If your brand isn&apos;t mentioned, you&apos;re invisible.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <div className="text-4xl font-bold text-primary mb-2">65%</div>
              <p className="text-sm text-muted-foreground">
                of B2B buyers now use AI assistants for product research
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <div className="text-4xl font-bold text-primary mb-2">3-5</div>
              <p className="text-sm text-muted-foreground">
                brands are typically mentioned per AI recommendation
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <div className="text-4xl font-bold text-primary mb-2">0</div>
              <p className="text-sm text-muted-foreground">
                clicks to your site if AI doesn&apos;t mention you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">How Context Memo Works</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              We create factual, citable memos based on what&apos;s already true about your brand.
              No fake content. No AI fluff. Just facts AI can cite.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Add Your Brand</h3>
              <p className="text-sm text-muted-foreground">
                Verify ownership via your work email domain
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">AI Extracts Facts</h3>
              <p className="text-sm text-muted-foreground">
                We scan your website to extract verified information
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Generate Memos</h3>
              <p className="text-sm text-muted-foreground">
                AI creates factual memos answering queries users ask
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-bold text-primary">4</span>
              </div>
              <h3 className="font-semibold mb-2">Get Cited</h3>
              <p className="text-sm text-muted-foreground">
                AI search engines find and cite your memos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <Search className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">AI Search Monitoring</h3>
              <p className="text-muted-foreground text-sm">
                Track how often you&apos;re mentioned in ChatGPT, Claude, and Perplexity 
                responses for queries that matter.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <FileText className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Factual Memos</h3>
              <p className="text-muted-foreground text-sm">
                Auto-generated comparison pages, industry guides, and how-to content 
                based on verified facts from your website.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border">
              <TrendingUp className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Visibility Score</h3>
              <p className="text-muted-foreground text-sm">
                See your AI visibility score and track improvements as your 
                memos get indexed and cited.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-4 mb-8">
              <Shield className="h-8 w-8 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">The Authenticity Principle</h3>
                <p className="text-muted-foreground">
                  We don&apos;t generate fake content. Every Context Memo is based on facts 
                  extracted from your own website and public information. If your website 
                  says you offer IoT sensors, the memo says that. If it doesn&apos;t, the memo 
                  doesn&apos;t either. All claims are traceable to a source.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">Only verified facts from your website</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">Competitor info from public sources only</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">Citations and sources on every memo</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">&quot;Last verified&quot; timestamps</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Early Adopter Model */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900">
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
          
          <Button size="lg" asChild>
            <Link href="/signup">
              Claim Your Spot
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <BarChart3 className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to improve your AI visibility?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join the brands already using Context Memo to get cited in AI recommendations.
          </p>
          <Button size="lg" asChild>
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
                <span className="text-zinc-400"> users signed up</span>
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
                Next tier: <span className="text-zinc-300">${nextTranche.price}/mo</span> after user #{currentTranche.max}
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
              const showLabel = true; // Show label for all tranches
              
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
                  {/* Label for every other tranche */}
                  {showLabel && (
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] whitespace-nowrap ${isCurrentTranche ? 'text-green-400 font-medium' : isPastTranche ? 'text-green-600' : 'text-zinc-500'}`}>
                      {tranche.price === 0 ? 'FREE' : `$${tranche.price}`}
                    </div>
                  )}
                  {/* Tooltip on hover for all */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-medium">{tranche.price === 0 ? 'FREE' : `$${tranche.price}/mo`}</div>
                    <div className="text-zinc-400">Users {tranche.min}-{tranche.max}</div>
                  </div>
                </div>
              );
            })}
            {/* Final $99 marker */}
            <div className="text-[9px] text-zinc-500 ml-1">$99</div>
          </div>
          <div className="flex justify-end mt-4 text-[10px] text-zinc-500">
            <span>2,000 users = max price</span>
          </div>
        </div>
      </div>
    </div>
  );
}
