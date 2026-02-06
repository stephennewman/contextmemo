/**
 * Lightweight sentiment classification for brand mentions in AI responses.
 * 
 * Analyzes the context around a brand mention to determine if the AI
 * is speaking positively, negatively, or neutrally about the brand.
 * 
 * No API call needed — uses pattern matching on the response text.
 */

export type BrandSentiment = 'positive' | 'negative' | 'neutral'

interface SentimentResult {
  sentiment: BrandSentiment
  reason: string
}

// Positive signals: AI is recommending, praising, or endorsing the brand
const POSITIVE_PATTERNS = [
  /\b(recommend|best|excellent|great|top|leading|outstanding|impressive|powerful|robust|reliable|popular|trusted|innovative|preferred|ideal|superior|strong|notable|standout)\b/i,
  /\b(excels|stands out|known for|specializes in|well-suited|well suited|designed for|perfect for|great for|ideal for|good choice|solid choice|strong choice|top pick|top choice)\b/i,
  /\b(highly rated|well-regarded|well regarded|industry leader|market leader|pioneer|first choice|go-to|favorite)\b/i,
  /\b(comprehensive|feature-rich|user-friendly|user friendly|easy to use|intuitive|scalable|affordable|cost-effective|efficient)\b/i,
  /\b(pros include|advantages|strengths|benefits|highlights)\b/i,
]

// Negative signals: AI is criticizing, warning, or discouraging the brand
const NEGATIVE_PATTERNS = [
  /\b(however|drawback|limitation|downside|weakness|lacking|lacks|limited|expensive|costly|complex|complicated|steep learning curve|not ideal|not recommended|not suitable)\b/i,
  /\b(struggles|falls short|behind|outdated|legacy|clunky|slow|buggy|unreliable|poor|worst|avoid|be cautious|watch out|be aware)\b/i,
  /\b(cons include|disadvantages|shortcomings|problems with|issues with|complaints)\b/i,
  /\b(cheaper alternatives|better alternatives|consider instead|switch from|migrate away|replacement for)\b/i,
  /\b(no longer|discontinued|deprecated|sunset|end of life)\b/i,
]

// Neutral signals: AI is just listing or describing without strong opinion
const NEUTRAL_PATTERNS = [
  /\b(also includes|another option|one option|available|offers|provides|includes|features|supports)\b/i,
  /\b(pricing starts|plans start|costs? \$|per month|per year|free tier|free plan)\b/i,
  /\b(founded in|headquartered|based in|acquired by|launched in)\b/i,
]

/**
 * Classify sentiment of a brand mention from AI response text.
 * 
 * Uses the brand_context (snippet around mention) or full response.
 * Looks at a window around the brand mention for sentiment signals.
 */
export function classifySentiment(
  responseText: string, 
  brandName: string,
  brandContext?: string | null,
): SentimentResult {
  // Use brand_context if available (already scoped), otherwise extract from response
  let textToAnalyze = brandContext || ''
  
  if (!textToAnalyze && responseText) {
    const lowerResponse = responseText.toLowerCase()
    const brandLower = brandName.toLowerCase()
    const idx = lowerResponse.indexOf(brandLower)
    
    if (idx === -1) {
      return { sentiment: 'neutral', reason: 'Brand not found in response text' }
    }
    
    // Extract ~500 char window around brand mention for better context
    const start = Math.max(0, idx - 250)
    const end = Math.min(responseText.length, idx + brandName.length + 250)
    textToAnalyze = responseText.slice(start, end)
  }
  
  if (!textToAnalyze) {
    return { sentiment: 'neutral', reason: 'No text to analyze' }
  }

  // Score positive vs negative signals
  let positiveScore = 0
  let negativeScore = 0
  let neutralScore = 0
  const positiveReasons: string[] = []
  const negativeReasons: string[] = []

  for (const pattern of POSITIVE_PATTERNS) {
    const matches = textToAnalyze.match(pattern)
    if (matches) {
      positiveScore++
      positiveReasons.push(matches[0].toLowerCase())
    }
  }

  for (const pattern of NEGATIVE_PATTERNS) {
    const matches = textToAnalyze.match(pattern)
    if (matches) {
      negativeScore++
      negativeReasons.push(matches[0].toLowerCase())
    }
  }

  for (const pattern of NEUTRAL_PATTERNS) {
    if (pattern.test(textToAnalyze)) {
      neutralScore++
    }
  }

  // Decision logic
  if (positiveScore > 0 && negativeScore > 0) {
    // Mixed: if roughly equal, it's neutral/mixed. If one dominates, go with it.
    if (positiveScore >= negativeScore * 2) {
      return { 
        sentiment: 'positive', 
        reason: `Mostly positive: ${positiveReasons.slice(0, 3).join(', ')}` 
      }
    }
    if (negativeScore >= positiveScore * 2) {
      return { 
        sentiment: 'negative', 
        reason: `Mostly negative: ${negativeReasons.slice(0, 3).join(', ')}` 
      }
    }
    return { 
      sentiment: 'neutral', 
      reason: `Mixed: positive (${positiveReasons.slice(0, 2).join(', ')}) and negative (${negativeReasons.slice(0, 2).join(', ')})` 
    }
  }
  
  if (positiveScore > 0) {
    return { 
      sentiment: 'positive', 
      reason: positiveReasons.slice(0, 3).join(', ') 
    }
  }
  
  if (negativeScore > 0) {
    return { 
      sentiment: 'negative', 
      reason: negativeReasons.slice(0, 3).join(', ') 
    }
  }

  // No strong signals either way
  return { 
    sentiment: 'neutral', 
    reason: neutralScore > 0 ? 'Listed without strong opinion' : 'No sentiment signals detected'
  }
}
