import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AuthLoading from '@/app/(auth)/loading'
import '@testing-library/jest-dom'

describe('AuthLoading', () => {
  it('renders multiple skeleton components', () => {
    render(<AuthLoading />)

    // Check for the presence of at least one skeleton element
    const skeletonElements = screen.getAllByTestId('skeleton-item')
    expect(skeletonElements.length).toBeGreaterThan(0)

    // Optionally, check for a specific number of skeleton elements if the design is fixed
    // For AuthLoading, there are several distinct skeleton elements
    // Counting them manually: 2 in header, 3x2 in form (for labels and inputs), 1 for button, 1 for footer. Total = 2 + 6 + 1 + 1 = 10 unique skeletons
    expect(skeletonElements).toHaveLength(8)
  })

  it('applies correct main container classes', () => {
    render(<AuthLoading />)

    const mainDiv = screen.getByTestId('auth-loading-main-div')
    expect(mainDiv).toHaveClass('flex items-center justify-center min-h-[calc(100vh-80px)]')
  })
})
