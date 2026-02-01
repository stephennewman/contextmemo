// Quick test for SerpAPI integration
// Run with: npx tsx scripts/test-serpapi.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { checkGoogleAIOverview } from '../lib/utils/serpapi'

async function testSerpAPI() {
  const apiKey = process.env.SERPAPI_KEY
  
  if (!apiKey) {
    console.error('❌ SERPAPI_KEY not found in environment')
    process.exit(1)
  }

  console.log('🔍 Testing SerpAPI with a sample query...\n')

  const testQuery = 'best CRM software for small business'
  const brandName = 'HubSpot'
  const brandDomain = 'hubspot.com'

  console.log(`Query: "${testQuery}"`)
  console.log(`Looking for: ${brandName} (${brandDomain})\n`)

  try {
    const result = await checkGoogleAIOverview(testQuery, brandName, brandDomain)

    console.log('✅ SerpAPI connection successful!\n')
    console.log('📊 Results:')
    console.log(`   AI Overview present: ${result.hasAIOverview ? '✅ Yes' : '❌ No'}`)
    console.log(`   Brand mentioned in overview: ${result.brandMentioned ? '✅ Yes' : '❌ No'}`)
    console.log(`   Brand position in overview: ${result.brandPosition || 'N/A'}`)
    console.log(`   Brand in sources: ${result.brandInSources ? '✅ Yes' : '❌ No'}`)
    console.log(`   Source count: ${result.overviewSources.length}`)
    console.log(`   Organic position: ${result.organicPosition || 'Not in top 10'}`)
    
    if (result.overviewText) {
      console.log('\n📝 AI Overview excerpt:')
      console.log(`   "${result.overviewText.substring(0, 300).replace(/\n/g, ' ')}..."`)
    }

    if (result.relatedQuestions.length > 0) {
      console.log(`\n📌 Related questions (${result.relatedQuestions.length}):`)
      result.relatedQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`   ${i + 1}. ${q}`)
      })
    }

    if (result.overviewSources.length > 0) {
      console.log('\n🔗 AI Overview sources:')
      result.overviewSources.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.title} - ${s.link}`)
      })
    }

    console.log('\n✅ SerpAPI integration is fully working!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testSerpAPI()
