/**
 * Image selection for HubSpot posts
 * 
 * Uses Unsplash images that are free to use and match content topics.
 */

// Stock images by topic (Unsplash direct URLs - free to use)
export const TOPIC_IMAGES: Record<string, { url: string; alt: string }> = {
  // Temperature monitoring & cold chain
  'cold_chain': {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=630&fit=crop',
    alt: 'Cold chain logistics and temperature-controlled storage facility'
  },
  'temperature_monitoring': {
    url: 'https://images.unsplash.com/photo-1581093458791-9d42e3c2fd45?w=1200&h=630&fit=crop',
    alt: 'Digital temperature monitoring and sensor technology'
  },
  // Food & hospitality
  'food_safety': {
    url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1200&h=630&fit=crop',
    alt: 'Food safety and quality control in commercial kitchen'
  },
  'haccp': {
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=630&fit=crop',
    alt: 'HACCP compliance and food safety monitoring systems'
  },
  'restaurant': {
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=630&fit=crop',
    alt: 'Restaurant kitchen food safety and compliance'
  },
  'hospitality': {
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=630&fit=crop',
    alt: 'Hotel and hospitality temperature management'
  },
  // Healthcare & pharma
  'pharmaceutical': {
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&h=630&fit=crop',
    alt: 'Pharmaceutical storage and medical supply chain'
  },
  'healthcare': {
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=630&fit=crop',
    alt: 'Healthcare facility management and compliance'
  },
  // Business & technology
  'software': {
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop',
    alt: 'Business software and technology solutions'
  },
  'comparison': {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    alt: 'Business comparison and analytics dashboard'
  },
  'alternative': {
    url: 'https://images.unsplash.com/photo-1553484771-047a44eee27b?w=1200&h=630&fit=crop',
    alt: 'Software alternatives and business solutions'
  },
  'how_to': {
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=630&fit=crop',
    alt: 'Team collaboration and learning'
  },
  'industry': {
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=630&fit=crop',
    alt: 'Industry solutions and business operations'
  },
  // Default
  'default': {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    alt: 'Business technology and monitoring solutions'
  }
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
  
  // Software/tech content based on memo type patterns
  if (text.includes(' vs ') || text.includes('versus') || text.includes('compared')) {
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
 * Get image for a topic
 */
export function getImageForTopic(topic: string): { url: string; alt: string } {
  return TOPIC_IMAGES[topic] || TOPIC_IMAGES['default']
}

/**
 * Get image based on memo content
 */
export function selectImageForMemo(title: string, content: string = '', memoType: string = ''): { url: string; alt: string } {
  const topic = detectTopic(title, content, memoType)
  return getImageForTopic(topic)
}
