/**
 * Image selection for HubSpot posts
 * 
 * Uses abstract/business Unsplash images that work for any content type.
 * Large pool of 50+ images with deterministic selection based on title hash.
 */

// Large pool of abstract and business images that work for any content
const ABSTRACT_IMAGE_POOL: Array<{ url: string; alt: string }> = [
  // Abstract patterns and gradients
  { url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=630&fit=crop', alt: 'Abstract gradient background' },
  { url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&h=630&fit=crop', alt: 'Purple gradient abstract' },
  { url: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1200&h=630&fit=crop', alt: 'Blue gradient abstract' },
  { url: 'https://images.unsplash.com/photo-1557682260-96773eb01377?w=1200&h=630&fit=crop', alt: 'Pink gradient abstract' },
  { url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&h=630&fit=crop', alt: 'Colorful abstract waves' },
  { url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=630&fit=crop', alt: 'Gradient mesh abstract' },
  { url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1200&h=630&fit=crop', alt: 'Abstract blue shapes' },
  { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&fit=crop', alt: 'Abstract geometric art' },
  { url: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=1200&h=630&fit=crop', alt: 'Abstract 3D shapes' },
  { url: 'https://images.unsplash.com/photo-1634017839464-5c339bbe3c35?w=1200&h=630&fit=crop', alt: 'Abstract colorful swirl' },
  
  // Technology and data
  { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop', alt: 'Technology circuit board' },
  { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=630&fit=crop', alt: 'Digital data matrix' },
  { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop', alt: 'Server room technology' },
  { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop', alt: 'Global network connections' },
  { url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=630&fit=crop', alt: 'Code on screen' },
  { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=630&fit=crop', alt: 'Cybersecurity concept' },
  { url: 'https://images.unsplash.com/photo-1488229297570-58520851e868?w=1200&h=630&fit=crop', alt: 'Network visualization' },
  { url: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200&h=630&fit=crop', alt: 'Blockchain technology' },
  
  // Business and analytics
  { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop', alt: 'Business analytics dashboard' },
  { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop', alt: 'Business data analysis' },
  { url: 'https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?w=1200&h=630&fit=crop', alt: 'Business strategy planning' },
  { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop', alt: 'Professional workspace' },
  { url: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop', alt: 'Charts and graphs' },
  { url: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=1200&h=630&fit=crop', alt: 'Financial data' },
  { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=630&fit=crop', alt: 'Stock market data' },
  
  // Geometric and minimal
  { url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&h=630&fit=crop', alt: 'Geometric minimal design' },
  { url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1200&h=630&fit=crop', alt: 'Minimal architecture' },
  { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=630&fit=crop', alt: 'Modern office design' },
  { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=630&fit=crop', alt: 'Clean office space' },
  { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=630&fit=crop', alt: 'Modern building architecture' },
  { url: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=1200&h=630&fit=crop', alt: 'Geometric patterns' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=630&fit=crop', alt: 'Abstract lines' },
  
  // Nature abstract
  { url: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1200&h=630&fit=crop', alt: 'Mountain landscape abstract' },
  { url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&h=630&fit=crop', alt: 'Ocean waves abstract' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=630&fit=crop', alt: 'Beach minimal' },
  { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=630&fit=crop', alt: 'Foggy landscape' },
  { url: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1200&h=630&fit=crop', alt: 'Forest aerial view' },
  
  // Light and bokeh
  { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=630&fit=crop', alt: 'Starry night sky' },
  { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=630&fit=crop', alt: 'Mountain peaks' },
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=630&fit=crop', alt: 'Sunset mountains' },
  { url: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=1200&h=630&fit=crop', alt: 'Golden hour landscape' },
  { url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&h=630&fit=crop', alt: 'Northern lights' },
  
  // More abstract patterns
  { url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=1200&h=630&fit=crop', alt: 'Neon light abstract' },
  { url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&h=630&fit=crop', alt: 'Light trails' },
  { url: 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=1200&h=630&fit=crop', alt: 'Marble texture' },
  { url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&h=630&fit=crop', alt: 'Ink in water' },
  { url: 'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=1200&h=630&fit=crop', alt: 'Abstract fluid art' },
  { url: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=1200&h=630&fit=crop', alt: 'Abstract paint' },
  
  // Modern workspace
  { url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&h=630&fit=crop', alt: 'Modern office' },
  { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=630&fit=crop', alt: 'Developer workspace' },
  { url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&h=630&fit=crop', alt: 'Laptop minimal' },
  { url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=630&fit=crop', alt: 'Tech workspace' },
  { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop', alt: 'Team working' },
  
  // Additional variety
  { url: 'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1200&h=630&fit=crop', alt: 'City lights blur' },
  { url: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=1200&h=630&fit=crop', alt: 'Keyboard close-up' },
  { url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop', alt: 'Robot technology' },
  { url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1200&h=630&fit=crop', alt: 'AI concept' },
  { url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop', alt: 'Artificial intelligence' },
  { url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop', alt: 'Neural network' },
]

/**
 * Hash function to convert a string to a number
 * Uses a better distribution algorithm for more unique results
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

/**
 * Select a unique image based on the memo title
 * Each title will always get the same image, but different titles get different images
 */
export function selectImageForMemo(title: string, _content: string = '', _memoType: string = ''): { url: string; alt: string } {
  const hash = hashString(title.toLowerCase().trim())
  const index = hash % ABSTRACT_IMAGE_POOL.length
  return ABSTRACT_IMAGE_POOL[index]
}

// Legacy exports for backwards compatibility
export function detectTopic(_title: string, _content: string = '', _memoType: string = ''): string {
  return 'default'
}

export function getImageForTopic(_topic: string, title: string = ''): { url: string; alt: string } {
  return selectImageForMemo(title)
}

export const TOPIC_IMAGES = {
  default: ABSTRACT_IMAGE_POOL[0]
}
