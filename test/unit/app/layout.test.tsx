import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RootLayout, { metadata } from '@/app/layout'
import '@testing-library/jest-dom'
import React from 'react'

// Mock the Toaster component
vi.mock('@/components/ui/sonner', () => ({
  Toaster: vi.fn(() => <div data-testid="mock-toaster" />),
}))

// Mock the next/font/google to prevent actual font loading issues in tests
vi.mock('next/font/google', () => ({
  Space_Grotesk: vi.fn(() => ({
    variable: 'mock-space-grotesk-variable',
    className: 'mock-space-grotesk-class',
  })),
  Geist_Mono: vi.fn(() => ({
    variable: 'mock-geist-mono-variable',
    className: 'mock-geist-mono-class',
  })),
}));

describe('RootLayout', () => {
  it('renders children and the Toaster component', () => {
    render(
      <RootLayout>
        <h1>Test Child Content</h1>
      </RootLayout>
    )

    // Assert that children are rendered
    expect(screen.getByText('Test Child Content')).toBeInTheDocument()

    // Assert that the mocked Toaster component is rendered
    expect(screen.getByTestId('mock-toaster')).toBeInTheDocument()
  })

  it('sets the correct lang attribute and applies font classes to the body', () => {
    render(
      <RootLayout>
        <div />
      </RootLayout>
    )

    // Assert lang attribute on html
    expect(document.documentElement).toHaveAttribute('lang', 'en')

    // Assert font classes on body
    const bodyElement = document.body
    expect(bodyElement).toHaveClass('mock-space-grotesk-variable mock-geist-mono-variable antialiased')
    expect(bodyElement).toHaveStyle('font-family: "Space Grotesk", system-ui, sans-serif')
  })

  it('includes the correct metadata (title, description, keywords)', () => {
    // metadata is an export from the layout, but not directly rendered by the component itself.
    // To test metadata, we typically check the exported `metadata` object directly.
    // In a real Next.js app, this would be handled by Next.js's head management,
    // but for unit testing the component, we can assert the exported value.


    expect(metadata.title).toBe('Context Memo - The facts AI needs to recommend you')
    expect(metadata.description).toBe('Create factual reference memos about your brand that AI search engines can cite. Improve your visibility in AI recommendations.')
    expect(metadata.keywords).toEqual([
      "AI search", "AI visibility", "brand memos", "AI recommendations", "ChatGPT", "Claude", "Perplexity"
    ])
  })
})
