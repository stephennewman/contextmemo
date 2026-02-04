/**
 * Content sanitization for HubSpot sync
 * 
 * Removes platform references (Contextmemo, Context Memo) from content
 * before syncing to customer's HubSpot blog.
 */

interface SanitizeOptions {
  brandName?: string
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
