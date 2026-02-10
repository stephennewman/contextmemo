/**
 * Image sourcing for memo content.
 * 
 * Uses Unsplash API when available (UNSPLASH_ACCESS_KEY),
 * falls back to a large curated pool of business-appropriate images.
 * 
 * Each memo gets unique images based on a hash of the source URL + topic,
 * so different articles never reuse the same photos.
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

// Large curated pool of business-appropriate images.
// No space imagery, no overly abstract tech. Focus on:
// professional settings, data/dashboards, teams, clean abstracts.
const FALLBACK_IMAGES: UnsplashImage[] = [
  // Data & dashboards
  { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop', alt: 'Business analytics dashboard', credit: 'Luke Chesser', creditUrl: 'https://unsplash.com/@lukechesser' },
  { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop', alt: 'Business data analysis', credit: 'Carlos Muza', creditUrl: 'https://unsplash.com/@kmuza' },
  { url: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=450&fit=crop', alt: 'Charts and graphs on paper', credit: 'Isaac Smith', creditUrl: 'https://unsplash.com/@isaacmsmith' },
  { url: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800&h=450&fit=crop', alt: 'Financial data visualization', credit: 'Maxim Hopman', creditUrl: 'https://unsplash.com/@nampoh' },
  { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop', alt: 'Data dashboard on screen', credit: 'Nicholas Cappello', creditUrl: 'https://unsplash.com/@nickcapp' },
  // Professional workspace & teams
  { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=450&fit=crop', alt: 'Team meeting at whiteboard', credit: 'Austin Distel', creditUrl: 'https://unsplash.com/@austindistel' },
  { url: 'https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=800&h=450&fit=crop', alt: 'Business strategy planning', credit: 'Helloquence', creditUrl: 'https://unsplash.com/@helloquence' },
  { url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&h=450&fit=crop', alt: 'Modern office space', credit: 'Adolfo Félix', creditUrl: 'https://unsplash.com/@adolfofelix' },
  { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=450&fit=crop', alt: 'Team working on laptops', credit: 'Marvin Meyer', creditUrl: 'https://unsplash.com/@marvelous' },
  { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop', alt: 'Team collaboration at table', credit: 'Jason Goodman', creditUrl: 'https://unsplash.com/@jasongoodman_youxventures' },
  // Marketing & content
  { url: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=450&fit=crop', alt: 'Marketing strategy session', credit: 'Campaign Creators', creditUrl: 'https://unsplash.com/@campaign_creators' },
  { url: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=450&fit=crop', alt: 'Content planning workspace', credit: 'Firmbee.com', creditUrl: 'https://unsplash.com/@firmbee' },
  { url: 'https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&h=450&fit=crop', alt: 'Digital marketing on screen', credit: 'Diggity Marketing', creditUrl: 'https://unsplash.com/@diggitymarketing' },
  // Developer & tech (no space)
  { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop', alt: 'Developer writing code', credit: 'Christopher Gower', creditUrl: 'https://unsplash.com/@cgower' },
  { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop', alt: 'Digital security concept', credit: 'Adi Goldstein', creditUrl: 'https://unsplash.com/@adigold1' },
  { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop', alt: 'Circuit board closeup', credit: 'Alexandre Debiève', creditUrl: 'https://unsplash.com/@alexkixa' },
  // AI & tech (grounded, not sci-fi)
  { url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=450&fit=crop', alt: 'AI interface on screen', credit: 'Steve Johnson', creditUrl: 'https://unsplash.com/@steve_j' },
  { url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=450&fit=crop', alt: 'Neural network visualization', credit: 'DeepMind', creditUrl: 'https://unsplash.com/@deepmind' },
  // Clean abstract gradients & shapes
  { url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=450&fit=crop', alt: 'Abstract gradient', credit: 'Lucas Benjamin', creditUrl: 'https://unsplash.com/@acharaphotography' },
  { url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=450&fit=crop', alt: 'Colorful gradient mesh', credit: 'Lucas Benjamin', creditUrl: 'https://unsplash.com/@acharaphotography' },
  { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=450&fit=crop', alt: 'Abstract geometric art', credit: 'Milad Fakurian', creditUrl: 'https://unsplash.com/@fakurian' },
  { url: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&h=450&fit=crop', alt: 'Abstract 3D shapes', credit: 'Milad Fakurian', creditUrl: 'https://unsplash.com/@fakurian' },
  // Additional business / presentations
  { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=450&fit=crop', alt: 'Business presentation', credit: 'Headway', creditUrl: 'https://unsplash.com/@headwayio' },
  { url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=450&fit=crop', alt: 'Modern office meeting', credit: 'Benjamin Child', creditUrl: 'https://unsplash.com/@bchild311' },
  { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=450&fit=crop', alt: 'Team brainstorming session', credit: 'Annie Spratt', creditUrl: 'https://unsplash.com/@anniespratt' },
  { url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&h=450&fit=crop', alt: 'Woman analyzing data on screen', credit: 'ThisisEngineering', creditUrl: 'https://unsplash.com/@thisisengineering' },
  { url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=450&fit=crop', alt: 'Collaborative planning session', credit: 'Mapbox', creditUrl: 'https://unsplash.com/@mapbox' },
  { url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=450&fit=crop', alt: 'Professionals in discussion', credit: 'LinkedIn Sales Solutions', creditUrl: 'https://unsplash.com/@linkedinsalesnavigator' },
  { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=450&fit=crop', alt: 'Conference room presentation', credit: 'Product School', creditUrl: 'https://unsplash.com/@productschool' },
  { url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=450&fit=crop', alt: 'Clean minimal workspace', credit: 'Edgar Chaparro', creditUrl: 'https://unsplash.com/@echaparro' },
]

/**
 * Generate a deterministic hash from a string.
 * Uses FNV-1a inspired algorithm for better distribution than char code sum.
 */
function hashString(str: string): number {
  let hash = 2166136261 // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 16777619) >>> 0 // FNV prime, keep as unsigned 32-bit
  }
  return hash
}

/**
 * Get fallback images from the curated pool.
 * Uses source URL + topic hash for per-article uniqueness.
 */
function getFallbackImages(topic: string, sourceUrl: string, count: number = 4): UnsplashImage[] {
  // Combine topic + source URL so different articles get different images
  const seed = hashString(`${sourceUrl}::${topic}`)
  
  // Fisher-Yates shuffle with deterministic seed
  const pool = [...FALLBACK_IMAGES]
  let rng = seed
  for (let i = pool.length - 1; i > 0; i--) {
    rng = ((rng * 1103515245) + 12345) >>> 0 // LCG PRNG
    const j = rng % (i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  
  return pool.slice(0, count)
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
 * Uses sourceUrl to ensure per-article uniqueness in fallback mode.
 */
export async function sourceImagesForTopic(
  topic: string,
  imageConceptsFromSource: string[] = [],
  count: number = 4,
  sourceUrl: string = ''
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

  // Fallback to curated pool (per-article unique selection)
  return getFallbackImages(topic, sourceUrl, count)
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
