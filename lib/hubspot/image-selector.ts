/**
 * Image selection for HubSpot posts
 * 
 * Uses Unsplash images that are free to use and match content topics.
 * Multiple images per topic to avoid repetition.
 * Selection is deterministic based on title hash for consistency.
 */

// Multiple images per topic for variety
const TOPIC_IMAGE_POOL: Record<string, Array<{ url: string; alt: string }>> = {
  // Temperature monitoring & cold chain
  'cold_chain': [
    { url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=630&fit=crop', alt: 'Cold chain logistics and temperature-controlled storage' },
    { url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1200&h=630&fit=crop', alt: 'Warehouse cold storage facility' },
    { url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&h=630&fit=crop', alt: 'Industrial refrigeration and logistics' },
    { url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200&h=630&fit=crop', alt: 'Supply chain and distribution center' },
  ],
  'temperature_monitoring': [
    { url: 'https://images.unsplash.com/photo-1581093458791-9d42e3c2fd45?w=1200&h=630&fit=crop', alt: 'Digital temperature monitoring technology' },
    { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop', alt: 'IoT sensors and monitoring devices' },
    { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop', alt: 'Data center monitoring systems' },
    { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop', alt: 'Analytics dashboard and monitoring' },
  ],
  // Food & hospitality
  'food_safety': [
    { url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1200&h=630&fit=crop', alt: 'Food safety in commercial kitchen' },
    { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=630&fit=crop', alt: 'Professional kitchen food preparation' },
    { url: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200&h=630&fit=crop', alt: 'Food quality inspection and control' },
    { url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=1200&h=630&fit=crop', alt: 'Restaurant kitchen hygiene standards' },
    { url: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=1200&h=630&fit=crop', alt: 'Food service quality management' },
  ],
  'haccp': [
    { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=630&fit=crop', alt: 'HACCP compliance in food service' },
    { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=630&fit=crop', alt: 'Food safety compliance standards' },
    { url: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&h=630&fit=crop', alt: 'Commercial kitchen compliance' },
    { url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=630&fit=crop', alt: 'Food safety regulations and standards' },
  ],
  'restaurant': [
    { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=630&fit=crop', alt: 'Restaurant kitchen operations' },
    { url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&h=630&fit=crop', alt: 'Modern restaurant interior' },
    { url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&h=630&fit=crop', alt: 'Restaurant dining experience' },
    { url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=630&fit=crop', alt: 'Professional restaurant kitchen' },
    { url: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1200&h=630&fit=crop', alt: 'Restaurant food service' },
  ],
  'hospitality': [
    { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=630&fit=crop', alt: 'Hotel and hospitality management' },
    { url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&h=630&fit=crop', alt: 'Luxury hotel lobby' },
    { url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=630&fit=crop', alt: 'Hotel service excellence' },
    { url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&h=630&fit=crop', alt: 'Hospitality industry operations' },
  ],
  // Healthcare & pharma
  'pharmaceutical': [
    { url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&h=630&fit=crop', alt: 'Pharmaceutical storage and logistics' },
    { url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&h=630&fit=crop', alt: 'Medical supply chain management' },
    { url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=630&fit=crop', alt: 'Pharmaceutical research facility' },
    { url: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=1200&h=630&fit=crop', alt: 'Medical laboratory operations' },
  ],
  'healthcare': [
    { url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=630&fit=crop', alt: 'Healthcare facility management' },
    { url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&h=630&fit=crop', alt: 'Modern hospital corridor' },
    { url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&h=630&fit=crop', alt: 'Healthcare technology solutions' },
    { url: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=1200&h=630&fit=crop', alt: 'Medical facility compliance' },
    { url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&h=630&fit=crop', alt: 'Hospital operations management' },
  ],
  // Business & technology - comparison/alternative content
  'comparison': [
    { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop', alt: 'Business analytics comparison' },
    { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop', alt: 'Data-driven decision making' },
    { url: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop', alt: 'Business strategy comparison' },
    { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=630&fit=crop', alt: 'Team evaluating business options' },
    { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop', alt: 'Software comparison analysis' },
    { url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&h=630&fit=crop', alt: 'Business meeting and evaluation' },
  ],
  'alternative': [
    { url: 'https://images.unsplash.com/photo-1553484771-047a44eee27b?w=1200&h=630&fit=crop', alt: 'Software alternatives and solutions' },
    { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&h=630&fit=crop', alt: 'Team exploring options' },
    { url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&h=630&fit=crop', alt: 'Planning alternative strategies' },
    { url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=630&fit=crop', alt: 'Business alternatives evaluation' },
    { url: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=1200&h=630&fit=crop', alt: 'Modern workplace solutions' },
    { url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&h=630&fit=crop', alt: 'Office technology alternatives' },
  ],
  'how_to': [
    { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=630&fit=crop', alt: 'Team collaboration and learning' },
    { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop', alt: 'Step-by-step guidance' },
    { url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=630&fit=crop', alt: 'Learning and implementation' },
    { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&fit=crop', alt: 'Professional training session' },
    { url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop', alt: 'Workshop and tutorial' },
    { url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&h=630&fit=crop', alt: 'Team implementation guide' },
  ],
  'industry': [
    { url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=630&fit=crop', alt: 'Industry solutions and operations' },
    { url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=630&fit=crop', alt: 'Industrial technology' },
    { url: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&h=630&fit=crop', alt: 'Manufacturing operations' },
    { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop', alt: 'Industry automation' },
  ],
  'software': [
    { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop', alt: 'Business software solutions' },
    { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop', alt: 'Software development' },
    { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=630&fit=crop', alt: 'Technology and coding' },
    { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=630&fit=crop', alt: 'Digital technology workspace' },
  ],
  // Senior living & education
  'senior_living': [
    { url: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=1200&h=630&fit=crop', alt: 'Senior care facility' },
    { url: 'https://images.unsplash.com/photo-1559234938-b60fff04894d?w=1200&h=630&fit=crop', alt: 'Elderly care services' },
    { url: 'https://images.unsplash.com/photo-1447005497901-b3e9ee359928?w=1200&h=630&fit=crop', alt: 'Senior living community' },
  ],
  'education': [
    { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=630&fit=crop', alt: 'Higher education campus' },
    { url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=630&fit=crop', alt: 'University learning environment' },
    { url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=630&fit=crop', alt: 'College campus facilities' },
  ],
  'retail': [
    { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=630&fit=crop', alt: 'Retail store operations' },
    { url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=630&fit=crop', alt: 'Shopping and retail' },
    { url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=630&fit=crop', alt: 'Supermarket and grocery' },
  ],
  // Default pool for generic content
  'default': [
    { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop', alt: 'Business technology solutions' },
    { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop', alt: 'Digital business analytics' },
    { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop', alt: 'Modern technology solutions' },
    { url: 'https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=1200&h=630&fit=crop', alt: 'Business innovation' },
    { url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=630&fit=crop', alt: 'Professional team collaboration' },
    { url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&h=630&fit=crop', alt: 'Business meeting' },
  ],
}

/**
 * Simple hash function to convert a string to a number
 * Used to deterministically select an image based on title
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Detect topic from content/title for image selection
 */
export function detectTopic(title: string, content: string = '', memoType: string = ''): string {
  const text = `${title} ${content} ${memoType}`.toLowerCase()
  
  // Check memo type first
  if (memoType === 'comparison') return 'comparison'
  if (memoType === 'alternative') return 'alternative'
  if (memoType === 'how_to') return 'how_to'
  if (memoType === 'industry') return 'industry'
  
  // Temperature/cold chain
  if (text.includes('cold chain') || text.includes('cold storage') || text.includes('freezer')) {
    return 'cold_chain'
  }
  if (text.includes('temperature') && (text.includes('monitor') || text.includes('sensor'))) {
    return 'temperature_monitoring'
  }
  
  // Food safety
  if (text.includes('haccp') || text.includes('hazard analysis')) {
    return 'haccp'
  }
  if (text.includes('food safety') || text.includes('food service') || text.includes('catering')) {
    return 'food_safety'
  }
  
  // Healthcare
  if (text.includes('pharma') || text.includes('vaccine') || text.includes('medical')) {
    return 'pharmaceutical'
  }
  if (text.includes('healthcare') || text.includes('hospital') || text.includes('clinic')) {
    return 'healthcare'
  }
  
  // Hospitality
  if (text.includes('hotel') || text.includes('hospitality') || text.includes('lodging')) {
    return 'hospitality'
  }
  if (text.includes('restaurant') || text.includes('kitchen')) {
    return 'restaurant'
  }
  
  // Senior living and education
  if (text.includes('senior') || text.includes('elderly') || text.includes('nursing home')) {
    return 'senior_living'
  }
  if (text.includes('university') || text.includes('college') || text.includes('education') || text.includes('higher ed')) {
    return 'education'
  }
  
  // Retail
  if (text.includes('retail') || text.includes('supermarket') || text.includes('grocery') || text.includes('store')) {
    return 'retail'
  }
  
  // Software/tech content based on memo type patterns
  if (text.includes(' vs ') || text.includes('versus') || text.includes('compared') || text.includes('key differences')) {
    return 'comparison'
  }
  if (text.includes('alternative') || text.includes('alternatives to')) {
    return 'alternative'
  }
  if (text.includes('how to') || text.includes('guide') || text.includes('step by step')) {
    return 'how_to'
  }
  
  return 'default'
}

/**
 * Get image for a topic, using title hash to select from pool
 * This ensures:
 * 1. Same title always gets same image (deterministic)
 * 2. Different titles get different images (variety)
 */
export function getImageForTopic(topic: string, title: string = ''): { url: string; alt: string } {
  const pool = TOPIC_IMAGE_POOL[topic] || TOPIC_IMAGE_POOL['default']
  
  // Use title hash to pick from pool - deterministic but varied
  const hash = hashString(title)
  const index = hash % pool.length
  
  return pool[index]
}

/**
 * Get image based on memo content
 * Uses title to deterministically select a unique image from the topic pool
 */
export function selectImageForMemo(title: string, content: string = '', memoType: string = ''): { url: string; alt: string } {
  const topic = detectTopic(title, content, memoType)
  return getImageForTopic(topic, title)
}

// Legacy export for backwards compatibility
export const TOPIC_IMAGES = Object.fromEntries(
  Object.entries(TOPIC_IMAGE_POOL).map(([key, images]) => [key, images[0]])
) as Record<string, { url: string; alt: string }>
