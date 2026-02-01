import Link from 'next/link'

export default function MockupsIndex() {
  const mockups = [
    {
      id: 'clean-professional',
      name: 'Clean Professional',
      description: 'Stripe/Linear inspired - trustworthy, mature, enterprise-ready',
      colors: ['#FAFAF9', '#4F46E5', '#F97066'],
      category: 'other',
    },
    {
      id: 'neural-dark',
      name: 'Neural Dark',
      description: 'Raycast/Arc inspired - AI-native, futuristic, glassmorphism',
      colors: ['#0F172A', '#06B6D4', '#A855F7'],
      category: 'other',
    },
    {
      id: 'soft-modern',
      name: 'Soft Modern',
      description: 'Notion/Figma inspired - friendly, approachable, rounded',
      colors: ['#F8FAFC', '#8B5CF6', '#2DD4BF'],
      category: 'other',
    },
    {
      id: 'bold-marketing',
      name: 'Bold Original',
      description: 'Electric blue on white - the baseline',
      colors: ['#FFFFFF', '#2563EB', '#FF6B6B'],
      category: 'bold',
    },
    {
      id: 'bold-vivid',
      name: 'Bold Vivid',
      description: 'Rich purple primary + multi-color accents - more personality',
      colors: ['#FFFFFF', '#7C3AED', '#10B981'],
      category: 'bold',
      featured: true,
    },
    {
      id: 'bold-multi',
      name: 'Bold Multi',
      description: 'Blue-purple-pink gradient flow - playful but professional',
      colors: ['#FAFAFA', '#3B82F6', '#EC4899'],
      category: 'bold',
      featured: true,
    },
    {
      id: 'bold-electric',
      name: 'Bold Electric',
      description: 'Sky blue + dark navy header - tech-forward, energetic',
      colors: ['#FFFFFF', '#0EA5E9', '#0F172A'],
      category: 'bold',
      featured: true,
    },
    {
      id: 'bold-neon',
      name: 'Bold Neon',
      description: 'Dark mode with cyan-purple gradients - cyberpunk',
      colors: ['#09090B', '#06B6D4', '#8B5CF6'],
      category: 'bold',
    },
    {
      id: 'bold-monochrome',
      name: 'Bold Monochrome',
      description: 'Pure black & white - sophisticated',
      colors: ['#FAFAFA', '#000000', '#FFFFFF'],
      category: 'bold',
    },
    {
      id: 'bold-coral',
      name: 'Bold Coral',
      description: 'Warm coral/orange - friendly energy',
      colors: ['#FFFBF5', '#FF6B35', '#F7C35F'],
      category: 'bold',
    },
    {
      id: 'bold-sport',
      name: 'Bold Sport',
      description: 'Neon green + skewed - too much but fun',
      colors: ['#0A0A0A', '#00FF87', '#141414'],
      category: 'bold',
    },
  ]

  const boldMockups = mockups.filter(m => m.category === 'bold')
  const otherMockups = mockups.filter(m => m.category === 'other')

  return (
    <div className="min-h-screen bg-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">UI Design Mockups</h1>
        <p className="text-zinc-600 mb-8">
          Click each option to see a full dashboard mockup in that style.
        </p>

        {/* New Color Variations - Highlighted */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold">More Colorful Options</h2>
            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold">NEW</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {boldMockups.filter(m => m.featured).map((mockup) => (
              <Link 
                key={mockup.id} 
                href={`/mockups/${mockup.id}`}
                className="block p-5 bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-zinc-300 hover:border-zinc-500"
              >
                <div className="flex gap-2 mb-3">
                  {mockup.colors.map((color, i) => (
                    <div 
                      key={i}
                      className="w-10 h-10 rounded-lg border border-zinc-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <h3 className="text-lg font-bold mb-1">{mockup.name}</h3>
                <p className="text-sm text-zinc-600">{mockup.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* All Bold Variations */}
        <div className="mb-12">
          <h2 className="text-lg font-bold mb-4 text-zinc-600">All Bold Variations</h2>
          <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
            {boldMockups.map((mockup) => (
              <Link 
                key={mockup.id} 
                href={`/mockups/${mockup.id}`}
                className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-zinc-200 hover:border-zinc-400"
              >
                <div className="flex gap-1.5 mb-2">
                  {mockup.colors.map((color, i) => (
                    <div 
                      key={i}
                      className="w-6 h-6 rounded border border-zinc-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <h3 className="text-sm font-bold mb-0.5">{mockup.name}</h3>
                <p className="text-xs text-zinc-500 line-clamp-1">{mockup.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Other Styles */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-zinc-500">Other Styles</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {otherMockups.map((mockup) => (
              <Link 
                key={mockup.id} 
                href={`/mockups/${mockup.id}`}
                className="block p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-zinc-200"
              >
                <div className="flex gap-2 mb-3">
                  {mockup.colors.map((color, i) => (
                    <div 
                      key={i}
                      className="w-6 h-6 rounded-full border border-zinc-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <h3 className="text-base font-semibold mb-1">{mockup.name}</h3>
                <p className="text-xs text-zinc-500">{mockup.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
