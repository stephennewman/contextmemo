import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AuthLayout from '@/app/(auth)/layout'
import '@testing-library/jest-dom' // For extended DOM matchers

describe('AuthLayout', () => {
  it('renders the header with the correct title and logo', () => {
    render(<AuthLayout><div/></AuthLayout>)

    const titleLink = screen.getByRole('link', { name: /CONTEXT MEMO/i })
    expect(titleLink).toBeInTheDocument()
    expect(titleLink.querySelector('svg')).toBeInTheDocument()
  })

  it('renders children within the content area', () => {
    const TestChild = () => <h1>Test Content</h1>
    render(<AuthLayout><TestChild /></AuthLayout>)

    // Check if the child component's content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies correct CSS classes for layout structure', () => {
    render(<AuthLayout><div/></AuthLayout>)

    // Check main container
    const mainDiv = screen.getByTestId('auth-layout-main-div') // Add data-testid to the main div in layout.tsx
    expect(mainDiv).toHaveClass('min-h-screen flex flex-col bg-white')

    // Check header
    const header = screen.getByRole('banner') // header often gets role="banner"
    expect(header).toHaveClass('bg-[#0F172A] py-4 px-6')

    // Check content area
    const contentArea = screen.getByTestId('auth-layout-content-area') // Add data-testid to the content div
    expect(contentArea).toHaveClass('flex-1 flex flex-col items-center justify-center px-4 py-12')
  })
})
