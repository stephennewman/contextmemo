/**
 * Image sourcing for memo content.
 * 
 * Uses Unsplash API when available (UNSPLASH_ACCESS_KEY),
 * falls back to curated pool from image-selector.ts.
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

interface UnsplashImage {
  url: string
  alt: string
  credit: string // photographer name for attribution
  creditUrl: string // photographer profile URL
}

/**
 * Search Unsplash for images matching a query.
 * Returns empty array if no API key or search fails.
 */
async function searchUnsplash(query: string, count: number = 4): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) return []

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      orientation: 'landscape',
      content_filter: 'high', // Safe content only
    })

    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error(`Unsplash API error: ${res.status}`)
      return []
    }

    const data = await res.json()

    return (data.results || []).map((photo: {
      urls: { regular: string }
      alt_description: string | null
      description: string | null
      user: { name: string; links: { html: string } }
    }) => ({
      url: photo.urls.regular, // 1080px wide, good quality
      alt: photo.alt_description || photo.description || query,
      credit: photo.user.name,
      creditUrl: photo.user.links.html,
    }))
  } catch (e) {
    console.error('Unsplash search failed:', e)
    return []
  }
}

// Curated fallback images categorized by topic keywords
const FALLBACK_IMAGES: Record<string, UnsplashImage[]> = {
  technology: [
    { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop', alt: 'Technology circuit board', credit: 'Alexandre Debiève', creditUrl: 'https://unsplash.com/@alexkixa' },
    { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop', alt: 'Global network connections', credit: 'NASA', creditUrl: 'https://unsplash.com/@nasa' },
    { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop', alt: 'Cybersecurity concept', credit: 'Adi Goldstein', creditUrl: 'https://unsplash.com/@adigold1' },
    { url: 'https://images.unsplash.com/photo-1488229297570-58520851e868?w=800&h=450&fit=crop', alt: 'Network visualization', credit: 'JJ Ying', creditUrl: 'https://unsplash.com/@jjying' },
  ],
  business: [
    { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop', alt: 'Business analytics dashboard', credit: 'Luke Chesser', creditUrl: 'https://unsplash.com/@lukechesser' },
    { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop', alt: 'Business data analysis', credit: 'Carlos Muza', creditUrl: 'https://unsplash.com/@kmuza' },
    { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=450&fit=crop', alt: 'Professional workspace', credit: 'Austin Distel', creditUrl: 'https://unsplash.com/@austindistel' },
    { url: 'https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=800&h=450&fit=crop', alt: 'Business strategy planning', credit: 'Helloquence', creditUrl: 'https://unsplash.com/@helloquence' },
  ],
  analytics: [
    { url: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=450&fit=crop', alt: 'Charts and graphs', credit: 'Isaac Smith', creditUrl: 'https://unsplash.com/@isaacmsmith' },
    { url: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800&h=450&fit=crop', alt: 'Financial data visualization', credit: 'Maxim Hopman', creditUrl: 'https://unsplash.com/@nampoh' },
    { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop', alt: 'Data dashboard', credit: 'Nicholas Cappello', creditUrl: 'https://unsplash.com/@nickcapp' },
  ],
  ai: [
    { url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop', alt: 'Artificial intelligence', credit: 'Steve Johnson', creditUrl: 'https://unsplash.com/@steve_j' },
    { url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800&h=450&fit=crop', alt: 'AI concept', credit: 'Possessed Photography', creditUrl: 'https://unsplash.com/@possessedphotography' },
    { url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=450&fit=crop', alt: 'Neural network', credit: 'DeepMind', creditUrl: 'https://unsplash.com/@deepmind' },
    { url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=450&fit=crop', alt: 'Robot technology', credit: 'Alex Knight', creditUrl: 'https://unsplash.com/@agk42' },
  ],
  marketing: [
    { url: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=450&fit=crop', alt: 'Marketing strategy', credit: 'Campaign Creators', creditUrl: 'https://unsplash.com/@campaign_creators' },
    { url: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=450&fit=crop', alt: 'Content planning', credit: 'Firmbee.com', creditUrl: 'https://unsplash.com/@firmbee' },
    { url: 'https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&h=450&fit=crop', alt: 'Digital marketing', credit: 'Diggity Marketing', creditUrl: 'https://unsplash.com/@diggitymarketing' },
  ],
  workspace: [
    { url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&h=450&fit=crop', alt: 'Modern office', credit: 'Adolfo Félix', creditUrl: 'https://unsplash.com/@adolfofelix' },
    { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop', alt: 'Developer workspace', credit: 'Christopher Gower', creditUrl: 'https://unsplash.com/@cgower' },
    { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=450&fit=crop', alt: 'Team working', credit: 'Marvin Meyer', creditUrl: 'https://unsplash.com/@marvelous' },
  ],
  general: [
    { url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=450&fit=crop', alt: 'Abstract gradient', credit: 'Lucas Benjamin', creditUrl: 'https://unsplash.com/@acharaphotography' },
    { url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=450&fit=crop', alt: 'Gradient mesh', credit: 'Lucas Benjamin', creditUrl: 'https://unsplash.com/@acharaphotography' },
    { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=450&fit=crop', alt: 'Abstract geometric art', credit: 'Milad Fakurian', creditUrl: 'https://unsplash.com/@fakurian' },
    { url: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&h=450&fit=crop', alt: 'Abstract 3D shapes', credit: 'Milad Fakurian', creditUrl: 'https://unsplash.com/@fakurian' },
  ],
}

// Keyword to category mapping
const KEYWORD_CATEGORIES: Record<string, string[]> = {
  technology: ['software', 'platform', 'tool', 'app', 'system', 'digital', 'cloud', 'saas', 'api', 'integration', 'automation', 'tech'],
  business: ['business', 'enterprise', 'company', 'organization', 'corporate', 'strategy', 'management', 'operations', 'roi'],
  analytics: ['analytics', 'data', 'metrics', 'tracking', 'dashboard', 'reporting', 'insights', 'performance', 'measure', 'kpi', 'visibility'],
  ai: ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'llm', 'generative', 'neural', 'model', 'chatbot', 'perplexity', 'gemini', 'claude'],
  marketing: ['marketing', 'seo', 'content', 'brand', 'campaign', 'audience', 'engagement', 'search', 'visibility', 'geo'],
  workspace: ['team', 'collaboration', 'workspace', 'remote', 'productivity', 'workflow'],
}

/**
 * Detect the best category for a topic string
 */
function detectCategory(topic: string): string {
  const lower = topic.toLowerCase()
  let bestCategory = 'general'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    const score = keywords.filter(kw => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  return bestCategory
}

/**
 * Get fallback images from the curated pool based on topic
 */
function getFallbackImages(topic: string, count: number = 4): UnsplashImage[] {
  const category = detectCategory(topic)
  const pool = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.general
  // Shuffle deterministically based on topic, take count
  const hash = topic.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const shuffled = [...pool].sort((a, b) => {
    const ha = (hash + a.url.length) % 100
    const hb = (hash + b.url.length) % 100
    return ha - hb
  })
  return shuffled.slice(0, count)
}

/**
 * Extract image descriptions from source markdown content.
 * Returns alt texts and surrounding context to understand what images are about.
 */
export function extractImageConcepts(markdown: string): string[] {
  const concepts: string[] = []

  // Match markdown images: ![alt](url)
  const imgRegex = /!\[([^\]]*)\]\([^)]+\)/g
  let match
  while ((match = imgRegex.exec(markdown)) !== null) {
    const alt = match[1].trim()
    if (alt && alt.length > 3 && !alt.match(/^(image|photo|img|screenshot|pic)\d*$/i)) {
      concepts.push(alt)
    }
  }

  // Match HTML images: <img ... alt="..." ...>
  const htmlImgRegex = /<img[^>]+alt=["']([^"']+)["'][^>]*>/gi
  while ((match = htmlImgRegex.exec(markdown)) !== null) {
    const alt = match[1].trim()
    if (alt && alt.length > 3) {
      concepts.push(alt)
    }
  }

  return [...new Set(concepts)].slice(0, 8) // Dedupe, cap at 8
}

/**
 * Source images for a memo topic.
 * 
 * Tries Unsplash API first (if key available), falls back to curated pool.
 * Returns images formatted for inclusion in prompts.
 */
export async function sourceImagesForTopic(
  topic: string,
  imageConceptsFromSource: string[] = [],
  count: number = 4
): Promise<UnsplashImage[]> {
  // Try Unsplash API first
  if (UNSPLASH_ACCESS_KEY) {
    // Build a search query from the topic + source image concepts
    const searchQuery = imageConceptsFromSource.length > 0
      ? `${topic} ${imageConceptsFromSource.slice(0, 2).join(' ')}`
      : topic
    
    const results = await searchUnsplash(searchQuery.slice(0, 100), count)
    if (results.length >= 2) {
      return results
    }
    // If too few results, try just the topic
    if (results.length < 2) {
      const topicResults = await searchUnsplash(topic.slice(0, 100), count)
      if (topicResults.length > 0) {
        return topicResults
      }
    }
  }

  // Fallback to curated pool
  return getFallbackImages(topic, count)
}

/**
 * Format images as a block of text for inclusion in AI prompts.
 */
export function formatImagesForPrompt(images: UnsplashImage[]): string {
  if (images.length === 0) return ''

  const imageList = images.map((img, i) => 
    `${i + 1}. ![${img.alt}](${img.url})\n   *Photo by [${img.credit}](${img.creditUrl}) on Unsplash*`
  ).join('\n\n')

  return `
AVAILABLE IMAGES:
Use these images in the article to add visual interest. Include 2-3 images placed between major sections (after a section heading, before the next paragraph). Use the exact markdown syntax provided.

${imageList}

IMAGE PLACEMENT RULES:
- Place images BETWEEN sections, not inside paragraphs
- Use the EXACT image markdown provided: the ![alt](url) line followed by the italic credit line on the next line
- Include at least 2 images in the article
- Space images evenly throughout the content (not all at the top or bottom)
- Each image block should have a blank line before and after
- The credit line MUST be italic (wrapped in * *) — do not change this formatting
`
}
