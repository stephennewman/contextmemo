/**
 * Content sanitization for HubSpot sync
 * 
 * Removes platform references (Contextmemo, Context Memo) from content
 * before syncing to customer's HubSpot blog.
 * Also handles formatting improvements for HubSpot CMS.
 */

interface SanitizeOptions {
  brandName?: string
  title?: string // If provided, removes the title from body content
}

/**
 * Patterns to remove from content before HubSpot sync
 */
const PATTERNS_TO_REMOVE = [
  // Contextmemo brand references
  /\bContext\s*Memo\b/gi,
  /\bContextmemo\b/gi,
  /contextmemo\.com/gi,
  // URLs with contextmemo
  /https?:\/\/[^\s]*contextmemo\.com[^\s]*/gi,
  // Footer attribution patterns (in case they slip through)
  /\*Context\s*Memo\s*·[^*]*\*/gi,
  /\*Auto-generated\s+(from|by)\s+Context\s*Memo[^*]*\*/gi,
]

/**
 * Footer patterns to replace with brand-specific attribution
 */
const FOOTER_PATTERNS = [
  // Match the standard footer format
  /\*[^*]+·\s*Auto-generated from verified brand information\*/gi,
]

/**
 * Sanitize markdown content before HubSpot sync
 * Removes Contextmemo references and cleans up attribution
 */
export function sanitizeContentForHubspot(
  markdown: string,
  options: SanitizeOptions = {}
): string {
  let content = markdown

  // Remove explicit Contextmemo references
  for (const pattern of PATTERNS_TO_REMOVE) {
    content = content.replace(pattern, '')
  }

  // Replace footer with brand-specific or generic attribution
  for (const pattern of FOOTER_PATTERNS) {
    if (options.brandName) {
      content = content.replace(pattern, `*${options.brandName}*`)
    } else {
      content = content.replace(pattern, '')
    }
  }

  // Remove title from content body if it matches the memo title
  // (HubSpot displays the title separately in the template)
  if (options.title) {
    // Remove H1 headers that match the title (with variations)
    const escapedTitle = options.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    content = content.replace(new RegExp(`^#\\s*${escapedTitle}\\s*\n+`, 'im'), '')
    // Also remove if it's just the first line without # marker
    content = content.replace(new RegExp(`^${escapedTitle}\\s*\n+`, 'im'), '')
  }

  // Remove any H1 at the beginning (HubSpot handles the title)
  content = content.replace(/^#\s+.+\n+/, '')

  // Clean up any resulting double/triple newlines
  content = content.replace(/\n{3,}/g, '\n\n')

  // Trim trailing whitespace
  content = content.trim()

  return content
}

/**
 * Sanitize HTML content (for already-converted content)
 */
export function sanitizeHtmlForHubspot(
  html: string,
  options: SanitizeOptions = {}
): string {
  let content = html

  // Same patterns but also handle HTML entities
  const htmlPatterns = [
    /\bContext\s*Memo\b/gi,
    /\bContextmemo\b/gi,
    /contextmemo\.com/gi,
    /https?:\/\/[^\s<"]*contextmemo\.com[^\s<"]*/gi,
    /<em>Context\s*Memo\s*·[^<]*<\/em>/gi,
    /<em>[^<]*Auto-generated from verified brand information<\/em>/gi,
  ]

  for (const pattern of htmlPatterns) {
    content = content.replace(pattern, '')
  }

  // Clean up empty paragraphs that might result
  content = content.replace(/<p>\s*<\/p>/gi, '')
  content = content.replace(/<em>\s*<\/em>/gi, '')

  return content
}

/**
 * Format HTML for HubSpot with proper spacing and styling
 * This applies inline styles since HubSpot templates may not have our CSS
 */
export function formatHtmlForHubspot(html: string): string {
  let content = html

  // Remove H1 at the beginning (HubSpot displays title separately)
  content = content.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, '')

  // Add spacing to headings
  content = content.replace(
    /<h2([^>]*)>/gi,
    '<h2$1 style="margin-top: 2rem; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 700; color: #1a1a1a;">'
  )
  content = content.replace(
    /<h3([^>]*)>/gi,
    '<h3$1 style="margin-top: 1.5rem; margin-bottom: 0.75rem; font-size: 1.25rem; font-weight: 600; color: #333;">'
  )

  // Add spacing to paragraphs
  content = content.replace(
    /<p([^>]*)>/gi,
    '<p$1 style="margin-bottom: 1rem; line-height: 1.7; color: #444;">'
  )

  // Style tables for better readability
  content = content.replace(
    /<table([^>]*)>/gi,
    '<table$1 style="width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.95rem;">'
  )
  content = content.replace(
    /<thead([^>]*)>/gi,
    '<thead$1 style="background-color: #f8f9fa;">'
  )
  content = content.replace(
    /<th([^>]*)>/gi,
    '<th$1 style="padding: 0.75rem 1rem; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; background-color: #f8f9fa; color: #1a1a1a;">'
  )
  content = content.replace(
    /<td([^>]*)>/gi,
    '<td$1 style="padding: 0.75rem 1rem; border: 1px solid #e5e7eb; color: #444;">'
  )

  // Style lists
  content = content.replace(
    /<ul([^>]*)>/gi,
    '<ul$1 style="margin: 1rem 0; padding-left: 1.5rem;">'
  )
  content = content.replace(
    /<ol([^>]*)>/gi,
    '<ol$1 style="margin: 1rem 0; padding-left: 1.5rem;">'
  )
  content = content.replace(
    /<li([^>]*)>/gi,
    '<li$1 style="margin-bottom: 0.5rem; line-height: 1.6;">'
  )

  // Style blockquotes
  content = content.replace(
    /<blockquote([^>]*)>/gi,
    '<blockquote$1 style="margin: 1.5rem 0; padding: 1rem 1.5rem; background-color: #f0f7ff; border-left: 4px solid #3b82f6; border-radius: 0 0.5rem 0.5rem 0;">'
  )

  // Style horizontal rules
  content = content.replace(
    /<hr([^>]*)\/?>/gi,
    '<hr$1 style="margin: 2rem 0; border: 0; border-top: 1px solid #e5e7eb;">'
  )

  // Style strong/bold
  content = content.replace(
    /<strong([^>]*)>/gi,
    '<strong$1 style="font-weight: 600; color: #1a1a1a;">'
  )

  return content
}

/**
 * Check if content contains Contextmemo references
 * Useful for identifying which memos need re-syncing
 */
export function hasContextmemoReferences(content: string): boolean {
  const patterns = [
    /\bContext\s*Memo\b/i,
    /\bContextmemo\b/i,
    /contextmemo\.com/i,
  ]
  
  return patterns.some(pattern => pattern.test(content))
}
