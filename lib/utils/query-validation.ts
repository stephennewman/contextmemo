/**
 * Validates generated queries to filter out low-quality patterns.
 * Applied before inserting into the queries table.
 */

/**
 * Check if a query is a low-quality branded label rather than a real buyer question.
 * 
 * Examples of BAD queries (returns true):
 *   "Checkit for Hospitality"
 *   "Acme for Retail"
 *   "BrandName for Senior Living"
 * 
 * Examples of GOOD queries (returns false):
 *   "Best temperature monitoring for hospitality"
 *   "What tool should I use for food safety compliance?"
 *   "Checkit alternatives for restaurants"
 */
export function isJunkQuery(queryText: string, brandName: string): boolean {
  const text = queryText.trim()
  const brand = brandName.trim().toLowerCase()
  const textLower = text.toLowerCase()
  
  // Pattern: "BrandName for X" where X is short (just a label, not a real question)
  if (textLower.startsWith(`${brand} for `) && text.split(' ').length <= 6) {
    return true
  }

  // Pattern: Just the brand name alone or brand + single word
  if (textLower === brand || text.split(' ').length <= 2) {
    return true
  }

  // Pattern: "BrandName [product/feature]" with no question structure (under 5 words)
  if (textLower.startsWith(brand) && text.split(' ').length <= 4 && !text.includes('?')) {
    return true
  }

  return false
}

/**
 * Filter an array of queries, removing junk entries.
 * Returns only valid queries.
 */
export function filterJunkQueries<T extends { query_text?: string; query?: string }>(
  queries: T[],
  brandName: string,
): T[] {
  return queries.filter(q => {
    const text = q.query_text || q.query || ''
    return !isJunkQuery(text, brandName)
  })
}
