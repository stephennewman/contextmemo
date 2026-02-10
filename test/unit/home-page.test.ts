import { describe, it, expect } from 'vitest'

// Test the pricing tranche logic (pure functions from app/page.tsx)
// These are the testable business logic functions from the home page

const PRICING_TRANCHES = [
  { min: 1, max: 10, price: 0 },
  { min: 11, max: 25, price: 1 },
  { min: 26, max: 50, price: 3 },
  { min: 51, max: 100, price: 5 },
  { min: 101, max: 175, price: 9 },
  { min: 176, max: 275, price: 15 },
  { min: 276, max: 400, price: 19 },
  { min: 401, max: 575, price: 29 },
  { min: 576, max: 800, price: 39 },
  { min: 801, max: 1100, price: 49 },
  { min: 1101, max: 1500, price: 65 },
  { min: 1501, max: 2000, price: 79 },
  { min: 2001, max: Infinity, price: 99 },
]

function getCurrentTranche(userCount: number) {
  return PRICING_TRANCHES.find(t => userCount >= t.min && userCount <= t.max) || PRICING_TRANCHES[PRICING_TRANCHES.length - 1]
}

function getNextTranche(userCount: number) {
  const currentIndex = PRICING_TRANCHES.findIndex(t => userCount >= t.min && userCount <= t.max)
  if (currentIndex < PRICING_TRANCHES.length - 1) {
    return PRICING_TRANCHES[currentIndex + 1]
  }
  return null
}

describe('Pricing Tranche Logic', () => {
  describe('getCurrentTranche', () => {
    it('returns first tranche (free) for user count 1', () => {
      const tranche = getCurrentTranche(1)
      expect(tranche?.price).toBe(0)
      expect(tranche?.min).toBe(1)
      expect(tranche?.max).toBe(10)
    })

    it('returns first tranche (free) for user count 10', () => {
      const tranche = getCurrentTranche(10)
      expect(tranche?.price).toBe(0)
    })

    it('returns second tranche ($1) for user count 11', () => {
      const tranche = getCurrentTranche(11)
      expect(tranche?.price).toBe(1)
    })

    it('returns correct tranche for user count 25', () => {
      const tranche = getCurrentTranche(25)
      expect(tranche?.price).toBe(1)
    })

    it('returns correct tranche for user count 26', () => {
      const tranche = getCurrentTranche(26)
      expect(tranche?.price).toBe(3)
    })

    it('returns correct tranche for user count 50', () => {
      const tranche = getCurrentTranche(50)
      expect(tranche?.price).toBe(3)
    })

    it('returns correct tranche for user count 100', () => {
      const tranche = getCurrentTranche(100)
      expect(tranche?.price).toBe(5)
    })

    it('returns correct tranche for user count 500', () => {
      const tranche = getCurrentTranche(500)
      expect(tranche?.price).toBe(29)
    })

    it('returns correct tranche for user count 1000', () => {
      const tranche = getCurrentTranche(1000)
      expect(tranche?.price).toBe(49)
    })

    it('returns max tranche for very high user count', () => {
      const tranche = getCurrentTranche(5000)
      expect(tranche?.price).toBe(99)
    })

    it('returns correct tranche at boundary 2001', () => {
      const tranche = getCurrentTranche(2001)
      expect(tranche?.price).toBe(99)
    })

    it('returns correct tranche at boundary 2000', () => {
      const tranche = getCurrentTranche(2000)
      expect(tranche?.price).toBe(79)
    })

    it('returns correct tranche at boundary 1500', () => {
      const tranche = getCurrentTranche(1500)
      expect(tranche?.price).toBe(65)
    })

    it('returns correct tranche at boundary 1501', () => {
      const tranche = getCurrentTranche(1501)
      expect(tranche?.price).toBe(79)
    })
  })

  describe('getNextTranche', () => {
    it('returns second tranche when in first tranche', () => {
      const nextTranche = getNextTranche(5)
      expect(nextTranche?.price).toBe(1)
    })

    it('returns third tranche when in second tranche', () => {
      const nextTranche = getNextTranche(15)
      expect(nextTranche?.price).toBe(3)
    })

    it('returns null when at max tranche', () => {
      const nextTranche = getNextTranche(5000)
      expect(nextTranche).toBeNull()
    })

    it('returns next tranche at boundary 10', () => {
      const nextTranche = getNextTranche(10)
      expect(nextTranche?.price).toBe(1)
    })

    it('returns next tranche at boundary 25', () => {
      const nextTranche = getNextTranche(25)
      expect(nextTranche?.price).toBe(3)
    })

    it('returns next tranche at boundary 2000', () => {
      const nextTranche = getNextTranche(2000)
      expect(nextTranche?.price).toBe(99)
    })

    it('returns null at boundary 2001', () => {
      const nextTranche = getNextTranche(2001)
      expect(nextTranche).toBeNull()
    })
  })

  describe('PricingBar Logic', () => {
    it('calculates spots left correctly for user count 7', () => {
      const currentTranche = getCurrentTranche(7)
      const spotsLeft = currentTranche.max - 7 + 1
      expect(spotsLeft).toBe(4) // 10 - 7 + 1 = 4
    })

    it('calculates spots left correctly for user count 1', () => {
      const currentTranche = getCurrentTranche(1)
      const spotsLeft = currentTranche.max - 1 + 1
      expect(spotsLeft).toBe(10) // 10 - 1 + 1 = 10
    })

    it('calculates spots left correctly for user count 10', () => {
      const currentTranche = getCurrentTranche(10)
      const spotsLeft = currentTranche.max - 10 + 1
      expect(spotsLeft).toBe(1) // 10 - 10 + 1 = 1
    })

    it('shows free pricing text for free tranche', () => {
      const currentTranche = getCurrentTranche(7)
      const priceText = currentTranche.price === 0 ? 'FREE' : `$${currentTranche.price}/MO`
      expect(priceText).toBe('FREE')
    })

    it('shows paid pricing text for paid tranche', () => {
      const currentTranche = getCurrentTranche(50)
      const priceText = currentTranche.price === 0 ? 'FREE' : `$${currentTranche.price}/MO`
      expect(priceText).toBe('$3/MO')
    })

    it('determines spots left indicator should show when <= 10', () => {
      const userCount = 7
      const currentTranche = getCurrentTranche(userCount)
      const spotsLeft = currentTranche.max - userCount + 1
      const shouldShowSpotsLeft = spotsLeft <= 10
      expect(shouldShowSpotsLeft).toBe(true)
    })

    it('determines spots left indicator shows when spots are low', () => {
      // When userCount is 7, spotsLeft = 10 - 7 + 1 = 4, which is <= 10
      const userCount = 7
      const currentTranche = getCurrentTranche(userCount)
      const spotsLeft = currentTranche.max - userCount + 1
      const shouldShowSpotsLeft = spotsLeft <= 10
      expect(shouldShowSpotsLeft).toBe(true)
      expect(spotsLeft).toBe(4)
    })
  })

  describe('Pricing Tranche Structure', () => {
    it('has 13 pricing tranches', () => {
      expect(PRICING_TRANCHES).toHaveLength(13)
    })

    it('has increasing prices', () => {
      for (let i = 1; i < PRICING_TRANCHES.length; i++) {
        expect(PRICING_TRANCHES[i].price).toBeGreaterThan(PRICING_TRANCHES[i - 1].price)
      }
    })

    it('has contiguous ranges (no gaps)', () => {
      for (let i = 1; i < PRICING_TRANCHES.length; i++) {
        expect(PRICING_TRANCHES[i].min).toBe(PRICING_TRANCHES[i - 1].max + 1)
      }
    })

    it('starts at min 1', () => {
      expect(PRICING_TRANCHES[0].min).toBe(1)
    })

    it('ends with Infinity max', () => {
      expect(PRICING_TRANCHES[PRICING_TRANCHES.length - 1].max).toBe(Infinity)
    })

    it('first tranche is free', () => {
      expect(PRICING_TRANCHES[0].price).toBe(0)
    })

    it('max price is $99', () => {
      expect(PRICING_TRANCHES[PRICING_TRANCHES.length - 1].price).toBe(99)
    })
  })
})
