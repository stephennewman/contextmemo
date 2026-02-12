const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'
const COURSE_URL = `${SITE_URL}/course`

interface EmailOutput {
  subject: string
  html: string
}

interface EmailContext {
  name: string | null
  email: string
  score?: number
  totalQuestions?: number
  baselineScore?: number | null
  courseTrack?: string | null
  missedCategories?: string[]
  nextModuleSlug?: string | null
}

// ─── Shared wrapper ────────────────────────────────────────────────

function emailWrapper(preheader: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Search Mastery</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}${'&nbsp;&zwnj;'.repeat(40)}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="padding:20px 32px;background-color:#0F172A;">
            <span style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">AI Search Mastery</span>
            <span style="font-size:12px;color:#64748B;margin-left:12px;">by Context Memo</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;background-color:#ffffff;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              You're receiving this because you enrolled in the AI Search Mastery course.<br>
              <a href="${SITE_URL}" style="color:#0EA5E9;text-decoration:none;">contextmemo.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function greeting(name: string | null): string {
  const first = name?.split(' ')[0] || 'there'
  return `<p style="margin:0 0 16px;font-size:15px;color:#0F172A;">Hi ${first},</p>`
}

function cta(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background-color:#0EA5E9;padding:12px 28px;">
      <a href="${url}" style="color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">${text}</a>
    </td></tr>
  </table>`
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">${text}</p>`
}

function bold(text: string): string {
  return `<strong style="color:#0F172A;">${text}</strong>`
}

// ─── Welcome / Immediate emails ────────────────────────────────────

export function enrolledWelcome(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Welcome to AI Search Mastery',
    html: emailWrapper(
      'Your baseline assessment is ready.',
      greeting(ctx.name) +
      paragraph(`You've enrolled in the AI Search Mastery course — a practical guide to making your brand visible in AI-generated search results.`) +
      paragraph(`Your first step: take the ${bold('baseline assessment')}. It's 25 questions, timed at 20 seconds each. This establishes your starting point before the course.`) +
      cta('Take the Baseline Assessment', `${COURSE_URL}/assessment?type=baseline`)
    ),
  }
}

export function baselineCompleted(ctx: EmailContext): EmailOutput {
  const pct = ctx.score && ctx.totalQuestions
    ? Math.round((ctx.score / ctx.totalQuestions) * 100)
    : 0
  const track = ctx.courseTrack === 'advanced' ? 'advanced' : 'standard'

  let trackMessage = ''
  if (track === 'advanced') {
    trackMessage = paragraph(`Your score qualified you for the ${bold('Advanced Track')} — the 10 core modules plus 4 deep-dive modules on retrieval systems, competitive intelligence, AI attribution, and agent commerce.`)
  } else if (pct >= 40) {
    trackMessage = paragraph(`You've got a solid foundation. The course will fill the gaps and give you actionable frameworks you can use immediately.`)
  } else {
    trackMessage = paragraph(`This is your starting point — and that's exactly why the course exists. You'll build up from fundamentals to practical execution, step by step.`)
  }

  const missedSection = ctx.missedCategories && ctx.missedCategories.length > 0
    ? paragraph(`Areas to focus on: ${bold(ctx.missedCategories.slice(0, 3).join(', '))}. The course covers all of these in depth.`)
    : ''

  return {
    subject: `Your baseline: ${ctx.score}/${ctx.totalQuestions} (${pct}%)`,
    html: emailWrapper(
      `You scored ${pct}% on the AI Search Mastery baseline.`,
      greeting(ctx.name) +
      paragraph(`You scored ${bold(`${ctx.score}/${ctx.totalQuestions} (${pct}%)`)} on your baseline assessment.`) +
      trackMessage +
      missedSection +
      cta('Start the Course', `${COURSE_URL}/learn`)
    ),
  }
}

export function finalCompleted(ctx: EmailContext): EmailOutput {
  const pct = ctx.score && ctx.totalQuestions
    ? Math.round((ctx.score / ctx.totalQuestions) * 100)
    : 0
  const baselinePct = ctx.baselineScore && ctx.totalQuestions
    ? Math.round((ctx.baselineScore / ctx.totalQuestions) * 100)
    : 0
  const improvement = (ctx.score || 0) - (ctx.baselineScore || 0)

  let resultMessage = ''
  if (improvement > 0) {
    resultMessage = paragraph(`You improved by ${bold(`${improvement} questions`)} — from ${baselinePct}% to ${pct}%. That's real progress.`)
  } else if (improvement === 0) {
    resultMessage = paragraph(`Same score as your baseline (${pct}%). The real test is applying this knowledge to your brand's AI visibility.`)
  } else {
    resultMessage = paragraph(`You scored ${pct}%, compared to ${baselinePct}% on your baseline. Check the full answer breakdown to see where to refine your understanding.`)
  }

  return {
    subject: `Final results: ${ctx.score}/${ctx.totalQuestions} (${pct}%)`,
    html: emailWrapper(
      `Your final assessment results are in.`,
      greeting(ctx.name) +
      paragraph(`You've completed the AI Search Mastery course and your final assessment.`) +
      paragraph(`Final score: ${bold(`${ctx.score}/${ctx.totalQuestions} (${pct}%)`)}`) +
      resultMessage +
      cta('View Full Results', `${COURSE_URL}/results?type=final`) +
      paragraph(`Ready to put this into practice? Context Memo helps brands monitor and improve their AI search visibility across ChatGPT, Claude, Perplexity, and Gemini.`) +
      cta('Get Started with Context Memo', `${SITE_URL}/request-access`)
    ),
  }
}

// ─── Beginner sequence ─────────────────────────────────────────────

export function beginner_day2(ctx: EmailContext): EmailOutput {
  return {
    subject: 'The one stat that should worry every marketer',
    html: emailWrapper(
      'AI search is changing how buyers find you.',
      greeting(ctx.name) +
      paragraph(`Here's the number: over ${bold('60% of Google searches now result in zero clicks')}. Users get their answer without visiting any website.`) +
      paragraph(`Now add AI search to that. When a buyer asks ChatGPT "What's the best tool for [your category]?" — they get a curated answer in seconds. If your brand isn't mentioned, you never existed in that buyer's journey.`) +
      paragraph(`This isn't a future problem. It's happening right now. The brands investing in AI visibility today are locking in advantages that will be very hard to displace.`) +
      paragraph(`Module 1 of the course covers exactly how this works — and what it means for your strategy.`) +
      cta('Continue the Course', `${COURSE_URL}/learn`)
    ),
  }
}

export function beginner_day5(ctx: EmailContext): EmailOutput {
  return {
    subject: 'AI search vs SEO: 3 differences that actually matter',
    html: emailWrapper(
      'SEO and GEO are not the same thing.',
      greeting(ctx.name) +
      paragraph(`Most marketers assume AI search optimization is just "SEO but for ChatGPT." It's not. Here are the 3 differences that matter:`) +
      paragraph(`${bold('1. Citations, not rankings.')} There's no "page 1." You're either mentioned in the AI's answer or you're invisible.`) +
      paragraph(`${bold('2. Multi-source consensus, not backlinks.')} AI models trust brands that are consistently referenced across independent sources — review sites, publications, comparison platforms.`) +
      paragraph(`${bold('3. Concepts, not keywords.')} AI understands meaning. Keyword stuffing doesn't help. Clear, factual content does.`) +
      paragraph(`Module 3 digs deeper into how to build a strategy that serves both SEO and AI search.`) +
      cta('Go to Module 3', `${COURSE_URL}/learn/ai-search-vs-seo`)
    ),
  }
}

export function beginner_day8(ctx: EmailContext): EmailOutput {
  return {
    subject: 'What does ChatGPT say about your brand?',
    html: emailWrapper(
      'Try this 5-minute exercise.',
      greeting(ctx.name) +
      paragraph(`Here's a quick exercise that often surprises marketers:`) +
      paragraph(`Open ChatGPT (or Claude, or Perplexity) and ask: ${bold('"What are the best [your category] tools for [your target customer]?"')}`) +
      paragraph(`Are you mentioned? Are your competitors? Is the information accurate?`) +
      paragraph(`Now try 4-5 more queries your buyers would actually ask. Track which AI models mention you and which don't.`) +
      paragraph(`This is your AI visibility baseline — and for most brands, it's an eye-opener. The course covers how to systematically monitor and improve these results.`) +
      cta('Continue the Course', `${COURSE_URL}/learn`)
    ),
  }
}

export function beginner_day12(ctx: EmailContext): EmailOutput {
  return {
    subject: 'The fastest AI visibility win (30 minutes)',
    html: emailWrapper(
      'One action you can take today.',
      greeting(ctx.name) +
      paragraph(`You don't need a 6-month strategy to start improving AI visibility. Here's one thing you can do in 30 minutes:`) +
      paragraph(`${bold('Update your website\'s About page and product pages with specific facts.')} Replace vague marketing language with concrete data:`) +
      paragraph(`Instead of: "We're a leading provider of innovative solutions"<br>Write: "Founded in 2019, serving 500+ B2B companies, 99.9% uptime SLA, integrates with Salesforce, HubSpot, and Slack"`) +
      paragraph(`AI models cite specific, verifiable facts. They skip vague claims. This single change makes your content more citable across every AI platform.`) +
      paragraph(`Module 5 covers more best practices like this.`) +
      cta('Go to Best Practices Module', `${COURSE_URL}/learn/best-practices`)
    ),
  }
}

export function beginner_day16(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Haven\'t finished the course? Here\'s the module that matters most',
    html: emailWrapper(
      'Pick up where you left off.',
      greeting(ctx.name) +
      paragraph(`We noticed you haven't finished the AI Search Mastery course yet. No pressure — but if you're short on time, here's the single most impactful module:`) +
      paragraph(`${bold('Module 5: Best Practices for AI Search Visibility')} covers the specific actions that move the needle. It's practical, not theoretical — and takes about 9 minutes to read.`) +
      paragraph(`After that, you'll have enough to start making real changes to your brand's AI presence.`) +
      cta('Go to Best Practices', `${COURSE_URL}/learn/best-practices`)
    ),
  }
}

export function beginner_day21(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Ready to see how much you learned?',
    html: emailWrapper(
      'Take the final assessment.',
      greeting(ctx.name) +
      paragraph(`You've completed all the course modules. Time to see how your knowledge has grown.`) +
      paragraph(`The final assessment is the same 25 questions from your baseline — but this time, you'll see your improvement and a full breakdown of correct and incorrect answers with explanations.`) +
      cta('Take the Final Assessment', `${COURSE_URL}/assessment?type=final`)
    ),
  }
}

// ─── Developing sequence ───────────────────────────────────────────

export function developing_day2(ctx: EmailContext): EmailOutput {
  return {
    subject: 'The #1 mistake marketers make with AI search',
    html: emailWrapper(
      'It\'s not what you think.',
      greeting(ctx.name) +
      paragraph(`The biggest mistake? ${bold('Treating AI search optimization exactly like SEO.')}`) +
      paragraph(`SEO rewards: keyword optimization, backlinks, technical health, page speed.<br>AI search rewards: factual density, multi-source consensus, entity clarity, third-party validation.`) +
      paragraph(`There's overlap, but the ranking signals are fundamentally different. A site that ranks #1 on Google can be completely absent from AI responses — and vice versa.`) +
      paragraph(`Module 6 covers the most common mistakes and anti-patterns in detail.`) +
      cta('Go to Things to Avoid', `${COURSE_URL}/learn/things-to-avoid`)
    ),
  }
}

export function developing_day5(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Audit your AI visibility in 15 minutes',
    html: emailWrapper(
      'A quick framework for benchmarking.',
      greeting(ctx.name) +
      paragraph(`Here's a quick AI visibility audit you can run in 15 minutes:`) +
      paragraph(`${bold('Step 1:')} Write down 5 queries your buyers would ask an AI assistant about your category.`) +
      paragraph(`${bold('Step 2:')} Run each query across ChatGPT, Claude, and Perplexity. For each, note: Are you mentioned? Are competitors mentioned? Is the info accurate?`) +
      paragraph(`${bold('Step 3:')} Count: Out of 15 responses (5 queries × 3 models), how many mention your brand?`) +
      paragraph(`That percentage is your AI visibility rate. Most brands are shocked to find it's below 20%.`) +
      paragraph(`Module 10 covers how to build a systematic monitoring process from this starting point.`) +
      cta('Go to Measuring Module', `${COURSE_URL}/learn/measuring-ai-search`)
    ),
  }
}

export function developing_day8(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Why your competitor gets cited and you don\'t',
    html: emailWrapper(
      'It\'s usually not about content quality.',
      greeting(ctx.name) +
      paragraph(`When a competitor consistently beats you in AI responses, it's rarely because their blog is better than yours.`) +
      paragraph(`The most common reason: ${bold('they have stronger third-party presence')}. More G2 reviews. More analyst mentions. More comparison articles on neutral sites.`) +
      paragraph(`AI models build confidence from consensus across independent sources. Your owned content is one data point. A G2 profile with 500 reviews is 500 data points — from independent users.`) +
      paragraph(`The fix isn't to write more blog posts. It's to systematically build presence on the platforms AI models trust.`) +
      cta('Continue the Course', `${COURSE_URL}/learn`)
    ),
  }
}

export function developing_day12(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Content formats that AI actually cites',
    html: emailWrapper(
      'Not all content is equal in AI search.',
      greeting(ctx.name) +
      paragraph(`The content types with the highest AI citation rates:`) +
      paragraph(`${bold('1. Comparison / "vs" pages')} — AI handles comparative queries constantly. Brands with structured comparison content win these.`) +
      paragraph(`${bold('2. FAQ pages')} — Direct Q&A format maps perfectly to how users query AI.`) +
      paragraph(`${bold('3. Data-driven guides')} — Original data, benchmarks, and specific metrics give AI something unique to cite.`) +
      paragraph(`${bold('4. Detailed product docs')} — Specific features, pricing tiers, integration lists. Not marketing copy — facts.`) +
      paragraph(`What doesn't work: generic blog posts, gated content, pages with vague claims and no specific data.`) +
      cta('Go to Content Strategy', `${COURSE_URL}/learn/content-strategy`)
    ),
  }
}

export function developing_day16(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Measuring AI search: what to track and what to ignore',
    html: emailWrapper(
      'Don\'t obsess over the wrong metrics.',
      greeting(ctx.name) +
      paragraph(`${bold('What to track:')}`) +
      paragraph(`• Citation rate — % of relevant queries where your brand is mentioned<br>• AI share of voice — your mentions vs. competitor mentions<br>• Branded search lift — are more people Googling your brand name?<br>• Self-reported attribution — "How did you hear about us?" with AI options`) +
      paragraph(`${bold('What to ignore (for now):')}`) +
      paragraph(`• AI referral clicks alone — they only capture 5-15% of AI influence<br>• Individual AI model rankings — there's no "position 1" in AI<br>• Daily fluctuations — AI responses change constantly, track monthly trends`) +
      cta('Continue the Course', `${COURSE_URL}/learn`)
    ),
  }
}

export function developing_day21(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Time to test what you\'ve learned',
    html: emailWrapper(
      'The final assessment is unlocked.',
      greeting(ctx.name) +
      paragraph(`You've worked through the course material. Now let's see where you stand.`) +
      paragraph(`The final assessment uses the same 25 questions as your baseline — but this time you'll get a full breakdown of your answers with explanations.`) +
      paragraph(`After that, if you want to operationalize what you've learned, Context Memo automates AI visibility monitoring and content generation for B2B brands.`) +
      cta('Take the Final Assessment', `${COURSE_URL}/assessment?type=final`)
    ),
  }
}

// ─── Advanced sequence ─────────────────────────────────────────────

export function advanced_day3(ctx: EmailContext): EmailOutput {
  return {
    subject: 'How Perplexity, ChatGPT, and Gemini retrieve differently',
    html: emailWrapper(
      'Same query, different results — here\'s why.',
      greeting(ctx.name) +
      paragraph(`Each AI platform uses a fundamentally different retrieval architecture, which means the same optimization won't work equally everywhere:`) +
      paragraph(`${bold('Perplexity:')} Always searches the web first. Favors structured, FAQ-style content. Comparison sites get cited disproportionately.`) +
      paragraph(`${bold('ChatGPT:')} Hybrid — uses training data as baseline, supplements with web search. Established brands get an incumbency advantage.`) +
      paragraph(`${bold('Gemini:')} Deep Google integration. Heavily leverages Knowledge Graph and Google Business Profile data.`) +
      paragraph(`${bold('Claude:')} Training-data-dominant. Gives balanced, multi-perspective answers. Hard to optimize for directly.`) +
      paragraph(`The advanced module on retrieval systems covers this in depth, including chunk optimization strategies.`) +
      cta('Go to Retrieval Systems Module', `${COURSE_URL}/learn/adv-ai-retrieval-systems`)
    ),
  }
}

export function advanced_day6(ctx: EmailContext): EmailOutput {
  return {
    subject: 'The AI attribution model your CFO will actually believe',
    html: emailWrapper(
      'Four layers of AI measurement.',
      greeting(ctx.name) +
      paragraph(`Standard analytics tools miss 85-95% of AI's influence. Here's a 4-layer attribution architecture that captures the full picture:`) +
      paragraph(`${bold('Layer 1: Direct referral')} — Traffic from chat.openai.com, perplexity.ai, etc. Easy to track, captures ~5-15%.`) +
      paragraph(`${bold('Layer 2: Branded search lift')} — Correlation between AI visibility improvements and branded search volume increases.`) +
      paragraph(`${bold('Layer 3: Self-reported')} — "How did you hear about us?" with AI-specific options on your forms.`) +
      paragraph(`${bold('Layer 4: Controlled experiments')} — A/B test AI optimization on one product line vs. control. The gold standard.`) +
      paragraph(`Start with Layer 1, add Layer 3 immediately, and build toward Layer 4 for budget justification.`) +
      cta('Go to Attribution Module', `${COURSE_URL}/learn/adv-attribution-measurement`)
    ),
  }
}

export function advanced_day10(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Reverse-engineering why your competitor wins in AI',
    html: emailWrapper(
      'A systematic framework for competitive intelligence.',
      greeting(ctx.name) +
      paragraph(`When a competitor consistently gets cited over you, here's the reverse-engineering process:`) +
      paragraph(`${bold('1. Collect')} — Copy the exact AI response for queries where they win.`) +
      paragraph(`${bold('2. Trace')} — Find the source for each claim the AI makes about them. Is it their G2 profile? An analyst report? A comparison article?`) +
      paragraph(`${bold('3. Pattern-match')} — What content types drive their citations? Reviews? Comparison pages? Docs?`) +
      paragraph(`${bold('4. Gap-assess')} — How much effort to close each gap? Quick wins vs. long-term investments.`) +
      paragraph(`${bold('5. Prioritize')} — Map gaps to revenue impact. A query driving $50K deals deserves more investment than one driving $500 transactions.`) +
      cta('Go to Competitive Intelligence Module', `${COURSE_URL}/learn/adv-competitive-intelligence`)
    ),
  }
}

export function advanced_day14(ctx: EmailContext): EmailOutput {
  return {
    subject: 'AI agents are already making buying decisions',
    html: emailWrapper(
      'Your next buyer might be a machine.',
      greeting(ctx.name) +
      paragraph(`AI agents that research, compare, and purchase on behalf of users aren't hypothetical — they're here and gaining capability fast.`) +
      paragraph(`When the "buyer" is an AI agent, the rules of marketing invert:`) +
      paragraph(`• Beautiful design doesn't matter (agents don't render CSS)<br>• Emotional storytelling doesn't register (agents evaluate data)<br>• "Contact Sales" pricing is invisible (agents need machine-readable numbers)<br>• Vague differentiators like "best-in-class" score zero`) +
      paragraph(`What agents need: structured product data, transparent pricing, standardized specs, and programmatic access to your capabilities.`) +
      paragraph(`The brands that make their product information machine-readable now will systematically win agent-mediated evaluations.`) +
      cta('Go to AI Agents Module', `${COURSE_URL}/learn/adv-ai-agents-commerce`)
    ),
  }
}

export function advanced_day18(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Building the AI visibility dashboard your team needs',
    html: emailWrapper(
      'The KPIs that matter.',
      greeting(ctx.name) +
      paragraph(`Here's the reporting framework for AI search that leadership actually cares about:`) +
      paragraph(`${bold('Monthly leading indicators:')}<br>• Citation rate across target queries<br>• AI share of voice vs. competitors<br>• Citation accuracy rate<br>• AI referral traffic trend`) +
      paragraph(`${bold('Quarterly lagging indicators:')}<br>• AI-attributed pipeline (self-reported + correlation)<br>• Branded search volume trend<br>• Win rate on AI-sourced leads<br>• Cost per citation gained`) +
      paragraph(`Don't lead with "we got mentioned 47 times." Lead with the business impact: "AI is influencing X% of qualified pipeline."`) +
      cta('Continue the Course', `${COURSE_URL}/learn`)
    ),
  }
}

export function advanced_day22(ctx: EmailContext): EmailOutput {
  return {
    subject: 'This is what Context Memo automates',
    html: emailWrapper(
      'From knowledge to execution.',
      greeting(ctx.name) +
      paragraph(`You've gone through the advanced AI search material. You know the frameworks, the metrics, and the strategies.`) +
      paragraph(`Context Memo operationalizes all of it:`) +
      paragraph(`• ${bold('AI Visibility Scanning')} — Automated monitoring across 9 AI models<br>• ${bold('Brand Mention Tracking')} — Know when and how AI talks about you<br>• ${bold('Content Generation')} — Factual memos that fill citation gaps<br>• ${bold('Competitive Intelligence')} — Track competitor citations alongside yours<br>• ${bold('AI Traffic Attribution')} — Connect AI visibility to your pipeline`) +
      paragraph(`If you're ready to move from understanding to execution, we'd like to show you the platform.`) +
      cta('Request Access', `${SITE_URL}/request-access`)
    ),
  }
}

// ─── Behavioral emails ─────────────────────────────────────────────

export function stall_no_start(ctx: EmailContext): EmailOutput {
  return {
    subject: 'Your course is waiting',
    html: emailWrapper(
      'Pick up where you left off.',
      greeting(ctx.name) +
      paragraph(`You took the baseline assessment but haven't started the course modules yet.`) +
      paragraph(`The first module takes about 8 minutes and covers the fundamentals — how AI search works, what GEO means, and why this matters for your marketing strategy.`) +
      paragraph(`No commitment beyond that. See if it's useful.`) +
      cta('Start Module 1', `${COURSE_URL}/learn/ai-search-fundamentals`)
    ),
  }
}

export function stall_halfway(ctx: EmailContext): EmailOutput {
  return {
    subject: 'You\'re halfway through — the best part is ahead',
    html: emailWrapper(
      'The actionable modules are next.',
      greeting(ctx.name) +
      paragraph(`You've completed half the course — that's the hard part. The remaining modules are where it gets practical:`) +
      paragraph(`• Best practices you can implement this week<br>• Content strategies with the highest citation rates<br>• How to measure and prove AI search ROI`) +
      paragraph(`Each module is 6-9 minutes. You could finish the rest in a single sitting.`) +
      cta('Continue Where You Left Off', `${COURSE_URL}/learn`)
    ),
  }
}

export function nudge_final(ctx: EmailContext): EmailOutput {
  return {
    subject: 'You finished the course — one step left',
    html: emailWrapper(
      'Take the final assessment to see your improvement.',
      greeting(ctx.name) +
      paragraph(`You've completed all the course modules. The final step is the assessment — same 25 questions, but this time you'll see your full results with correct answers and explanations.`) +
      paragraph(`It takes about 8 minutes. Let's see how you did.`) +
      cta('Take the Final Assessment', `${COURSE_URL}/assessment?type=final`)
    ),
  }
}

export function final_improved(ctx: EmailContext): EmailOutput {
  const improvement = (ctx.score || 0) - (ctx.baselineScore || 0)
  return {
    subject: `You improved by ${improvement} questions`,
    html: emailWrapper(
      'Real progress.',
      greeting(ctx.name) +
      paragraph(`Your final score improved by ${bold(`${improvement} questions`)} over your baseline. That's not just knowledge — it's a new lens for how you think about marketing strategy.`) +
      paragraph(`The next step is applying it. Context Memo automates the monitoring and optimization you learned about in the course.`) +
      cta('See Context Memo in Action', `${SITE_URL}/request-access`)
    ),
  }
}

export function final_same(ctx: EmailContext): EmailOutput {
  return {
    subject: 'The real test is applying it',
    html: emailWrapper(
      'Knowledge becomes value through execution.',
      greeting(ctx.name) +
      paragraph(`Your final score was similar to your baseline. That's okay — the assessment captures a snapshot, but the real value is in how you apply these frameworks to your brand's AI visibility strategy.`) +
      paragraph(`If you want to put this into practice, Context Memo helps B2B teams monitor and improve their AI search visibility systematically.`) +
      cta('Learn More About Context Memo', `${SITE_URL}/request-access`)
    ),
  }
}

// ─── Email registry ────────────────────────────────────────────────

type EmailGenerator = (ctx: EmailContext) => EmailOutput

const emailRegistry: Record<string, EmailGenerator> = {
  // Welcome / immediate
  enrolled_welcome: enrolledWelcome,
  baseline_completed: baselineCompleted,
  final_completed: finalCompleted,
  // Beginner
  beginner_day2,
  beginner_day5,
  beginner_day8,
  beginner_day12,
  beginner_day16,
  beginner_day21,
  // Developing
  developing_day2,
  developing_day5,
  developing_day8,
  developing_day12,
  developing_day16,
  developing_day21,
  // Advanced
  advanced_day3,
  advanced_day6,
  advanced_day10,
  advanced_day14,
  advanced_day18,
  advanced_day22,
  // Behavioral
  stall_no_start,
  stall_halfway,
  nudge_final,
  final_improved,
  final_same,
}

export function getEmail(emailKey: string, ctx: EmailContext): EmailOutput | null {
  const generator = emailRegistry[emailKey]
  if (!generator) return null
  return generator(ctx)
}
