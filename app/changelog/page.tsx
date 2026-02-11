import { Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import fs from "fs";
import path from "path";
import { marked } from "marked";

export const metadata = {
  title: "Changelog | Context Memo",
  description: "See what's new in Context Memo - all features, improvements, and fixes.",
};

async function getChangelog() {
  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  const content = fs.readFileSync(changelogPath, "utf-8");
  return content;
}

export default async function ChangelogPage() {
  const changelogContent = await getChangelog();
  const htmlContent = await marked(changelogContent);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <header className="sticky top-0 bg-[#0F172A]/95 backdrop-blur-sm z-40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-[#0EA5E9]" />
            <span className="font-black text-xl tracking-tight">CONTEXT MEMO</span>
          </Link>
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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK TO HOME
          </Link>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">CHANGELOG</h1>
          <p className="mt-4 text-xl text-slate-400">
            All the latest features, improvements, and fixes.
          </p>
        </div>

        {/* Changelog Content */}
        <article 
          className="prose prose-invert max-w-none
            prose-headings:font-black prose-headings:tracking-tight
            prose-h1:text-4xl prose-h1:border-b prose-h1:border-white/20 prose-h1:pb-4 prose-h1:mb-8
            prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:text-[#0EA5E9]
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-white
            prose-p:text-slate-400 prose-p:leading-relaxed
            prose-ul:my-4
            prose-li:my-1 prose-li:text-slate-400
            prose-strong:text-white prose-strong:font-bold
            prose-table:text-sm
            prose-th:bg-white/10 prose-th:text-white prose-th:font-bold
            prose-td:border-white/10 prose-th:border-white/10
            prose-code:bg-white/10 prose-code:text-[#0EA5E9] prose-code:px-2 prose-code:py-1 prose-code:rounded-none prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:font-mono
            prose-a:text-[#0EA5E9] prose-a:no-underline hover:prose-a:underline
            prose-hr:border-white/20"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-[#0EA5E9]" />
              <span className="font-black tracking-tight">CONTEXT MEMO</span>
            </div>
            <div className="flex items-center gap-8 text-sm font-semibold text-slate-400">
              <Link href="/login" className="hover:text-white transition-colors">SIGN IN</Link>
              <Link href="/request-access" className="hover:text-white transition-colors">REQUEST ACCESS</Link>
              <Link href="/changelog" className="hover:text-white transition-colors">CHANGELOG</Link>
              <Link href="/about/editorial" className="hover:text-white transition-colors">EDITORIAL</Link>
            </div>
            <p className="text-sm text-slate-500 font-semibold">
              &copy; 2026 CONTEXT MEMO
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
