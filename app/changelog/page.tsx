import { FileText, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-40">
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
              <Link href="/signup">Start Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold">Changelog</h1>
          <p className="mt-2 text-muted-foreground">
            All the latest features, improvements, and fixes to Context Memo.
          </p>
        </div>

        {/* Changelog Content */}
        <article 
          className="prose prose-zinc dark:prose-invert max-w-none
            prose-headings:font-semibold
            prose-h1:text-3xl prose-h1:border-b prose-h1:pb-4 prose-h1:mb-6
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-ul:my-2
            prose-li:my-0.5
            prose-table:text-sm
            prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800
            prose-td:border prose-th:border
            prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">Context Memo</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-foreground">Sign In</Link>
              <Link href="/signup" className="hover:text-foreground">Sign Up</Link>
              <Link href="/changelog" className="hover:text-foreground">Changelog</Link>
              <Link href="/about/editorial" className="hover:text-foreground">Editorial Guidelines</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Context Memo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
