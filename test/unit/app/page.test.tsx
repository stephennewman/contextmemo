import { describe, it, expect } from 'vitest'
import Home, { PricingBar, getCurrentTranche, getNextTranche } from '@/app/page'
import { render, screen, within } from '@testing-library/react'

describe('Pricing Functions', () => {
  describe('getCurrentTranche', () => {
    it('should return the correct tranche for a given user count within a range', () => {
      expect(getCurrentTranche(5)).toEqual({ min: 1, max: 10, price: 0 });
      expect(getCurrentTranche(15)).toEqual({ min: 11, max: 25, price: 1 });
      expect(getCurrentTranche(50)).toEqual({ min: 26, max: 50, price: 3 });
    });

    it('should return the last tranche for a very high user count', () => {
      expect(getCurrentTranche(5000)).toEqual({ min: 2001, max: Infinity, price: 99 });
    });

    it('should return the first tranche for minimum user count', () => {
      expect(getCurrentTranche(1)).toEqual({ min: 1, max: 10, price: 0 });
    });
  });

  describe('getNextTranche', () => {
    it('should return the next tranche for a given user count', () => {
      expect(getNextTranche(5)).toEqual({ min: 11, max: 25, price: 1 });
      expect(getNextTranche(25)).toEqual({ min: 26, max: 50, price: 3 });
    });

    it('should return null for the last tranche', () => {
      expect(getNextTranche(5000)).toBeNull();
      expect(getNextTranche(2001)).toBeNull(); // Last tranche starts at 2001
    });
  });
});

describe('Home Component', () => {
  it('renders without crashing', () => {
    render(<Home />);
    // Use role heading to match text that might be split across elements
    expect(screen.getByRole('heading', { name: /GET CITED IN AI SEARCH/i })).toBeInTheDocument();
  });

  it('renders the header with navigation links', () => {
    render(<Home />);
    // Query the header section for more specificity
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: /CONTEXT MEMO/i })).toBeInTheDocument(); // Logo text
    expect(within(header).getByRole('link', { name: 'FEATURES' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'HOW IT WORKS' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'PRICING' })).toBeInTheDocument();
    // Query within the header for specific links
    expect(within(header).getByRole('link', { name: 'SIGN IN' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'START FREE' })).toBeInTheDocument();
  });

  it('renders the Hero section with correct text and CTAs', () => {
    render(<Home />);
    expect(screen.getByText(/Your buyers ask ChatGPT, Claude, and Perplexity for recommendations\./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /START FREE TRIAL/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SEE HOW IT WORKS/i })).toBeInTheDocument();
    expect(screen.getByText('MONITORS:')).toBeInTheDocument();
    expect(screen.getByText('CHATGPT', { selector: 'span.px-4.py-2.bg-white\\/5' })).toBeInTheDocument(); // target the specific span containing CHATGPT
  });

  it('renders the Stats section with key metrics', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /THE NEW BUYER JOURNEY/i })).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('3-5')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // For clicks if AI doesn't mention you
    expect(screen.getByText(/What's the best CRM for small B2B teams\?/i)).toBeInTheDocument();
  });

  it('renders the Features section with all features listed', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /EVERYTHING YOU NEED/i })).toBeInTheDocument();
    expect(screen.getByText('6 AI MODEL SCANNING')).toBeInTheDocument();
    expect(screen.getByText('COMPETITIVE INTELLIGENCE')).toBeInTheDocument();
    expect(screen.getByText('AUTO-GENERATED MEMOS')).toBeInTheDocument();
    expect(screen.getByText('SEARCH CONSOLE SYNC')).toBeInTheDocument();
    expect(screen.getByText('CONTENT INTELLIGENCE')).toBeInTheDocument();
    expect(screen.getByText('PERSONA TARGETING')).toBeInTheDocument();
  });

  it('renders the How It Works section with all steps', () => {
    render(<Home />);
    // Query by heading role for specificity
    expect(screen.getByRole('heading', { name: 'HOW IT WORKS' })).toBeInTheDocument();
    expect(screen.getByText('CONNECT YOUR BRAND')).toBeInTheDocument();
    expect(screen.getByText('DISCOVER LANDSCAPE')).toBeInTheDocument();
    expect(screen.getByText('MONITOR VISIBILITY')).toBeInTheDocument();
    expect(screen.getByText('AUTO-GENERATE CONTENT')).toBeInTheDocument();
  });

  it('renders the Trust section', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /THE AUTHENTICITY PRINCIPLE/i })).toBeInTheDocument();
    expect(screen.getByText('Only verified facts from your website')).toBeInTheDocument();
  });

  it('renders the Use Cases section', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /BUILT FOR B2B TEAMS/i })).toBeInTheDocument();
    expect(screen.getByText('DEMAND GEN LEADERS')).toBeInTheDocument();
    expect(screen.getByText('PRODUCT MARKETERS')).toBeInTheDocument();
    expect(screen.getByText('CONTENT TEAMS')).toBeInTheDocument();
  });

  it('renders the Pricing section with current and future pricing', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /EARLY ADOPTER PRICING/i })).toBeInTheDocument();
    // Use a more specific selector for the FREE text in pricing
    expect(screen.getByText('FREE', { selector: 'div.text-7xl.md\\:text-8xl.font-black' })).toBeInTheDocument();
    expect(screen.getByText('$5')).toBeInTheDocument(); // Example next price
    expect(screen.getByRole('link', { name: 'CLAIM YOUR FREE SPOT' })).toBeInTheDocument();
    expect(screen.getByText('EVERYTHING INCLUDED:')).toBeInTheDocument();
    expect(screen.getByText('6 AI model scans')).toBeInTheDocument();
  });

  it('renders the Final CTA section', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /START GETTING CITED BY AI/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'START YOUR FREE TRIAL' })).toBeInTheDocument();
  });

  it('renders the footer with navigation and copyright', () => {
    render(<Home />);
    // Distinguish the footer from PricingBar using its aria-label
    const footer = screen.getByRole('contentinfo', { name: /footer/i }); 
    expect(within(footer).getByText('CONTEXT MEMO')).toBeInTheDocument(); // Logo text in footer
    expect(within(footer).getByRole('link', { name: 'SIGN IN' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'SIGN UP' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'CHANGELOG' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'EDITORIAL' })).toBeInTheDocument();
    expect(footer).toHaveTextContent(/© 2026 CONTEXT MEMO/i);
  });
});


describe('PricingBar Component', () => {
  it('renders with FREE FOR LIFE for 7 users', () => {
    render(<PricingBar currentUserCount={7} />);
    // Check for "FREE" and "FOR LIFE" separately as they are in different spans
    expect(screen.getByText('FREE', { selector: 'span.text-white' })).toBeInTheDocument();
    expect(screen.getByText('FOR LIFE', { selector: 'span.text-\\[\\#0EA5E9\\]' })).toBeInTheDocument();
    expect(screen.getByText('4 SPOTS LEFT')).toBeInTheDocument();
    const pricingBar = screen.getByRole('contentinfo', { name: /pricing bar/i });
    expect(within(pricingBar).getByRole('link', { name: 'START FREE' })).toBeInTheDocument();
  });

  it('renders with locked in price for 15 users', () => {
    render(<PricingBar currentUserCount={15} />);
    expect(screen.getByText('$1/MO', { selector: 'span.text-white' })).toBeInTheDocument();
    expect(screen.getByText('FOR LIFE', { selector: 'span.text-\\[\\#0EA5E9\\]' })).toBeInTheDocument();
    expect(screen.queryByText('SPOTS LEFT')).not.toBeInTheDocument(); // Should not show spots left
    const pricingBar = screen.getByRole('contentinfo', { name: /pricing bar/i });
    expect(within(pricingBar).getByRole('link', { name: 'LOCK IN $1/MO' })).toBeInTheDocument();
  });

  it('renders with no spots left for 10 users', () => {
    render(<PricingBar currentUserCount={10} />);
    expect(screen.getByText('FREE', { selector: 'span.text-white' })).toBeInTheDocument();
    expect(screen.getByText('FOR LIFE', { selector: 'span.text-\\[\\#0EA5E9\\]' })).toBeInTheDocument();
    expect(screen.queryByText('SPOTS LEFT')).not.toBeInTheDocument();
    const pricingBar = screen.getByRole('contentinfo', { name: /pricing bar/i });
    expect(within(pricingBar).getByRole('link', { name: 'START FREE' })).toBeInTheDocument();
  });
});
