import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/(auth)/signup/page'
import { getEmailDomain } from '@/lib/utils/domain-verification'
import { createClient } from '@/lib/supabase/client'

// Define mocks at top level
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null })
    }
  })
}))

// Type for Supabase client mock
type MockSupabaseClient = {
  auth: {
    signUp: ReturnType<typeof vi.fn>
  }
}

vi.mock('@/lib/utils/domain-verification', () => ({
  getEmailDomain: vi.fn().mockReturnValue('company.com')
}))

describe('SignupPage', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.mocked(getEmailDomain).mockClear()
    vi.mocked(getEmailDomain).mockReturnValue('company.com') // Reset to default
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      headers: new Headers(),
      redirected: false,
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: '',
      clone: vi.fn(),
      body: null,
      bodyUsed: false,
      arrayBuffer: vi.fn(),
      blob: vi.fn(),
      formData: vi.fn(),
      text: vi.fn()
    } as unknown as Response))
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('renders the signup form correctly', async () => {
    render(<SignupPage />)
    expect(screen.getByRole('heading', { name: /CREATE YOUR ACCOUNT/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/FULL NAME/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/WORK EMAIL/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/PASSWORD/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CREATE ACCOUNT/i })).toBeInTheDocument()
    expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /SIGN IN/i })).toBeInTheDocument()
  })

  it('handles input changes', async () => {
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'jane@company.com')
    await user.type(passwordInput, 'Password123!')
    expect(nameInput).toHaveValue('Jane Doe')
    expect(emailInput).toHaveValue('jane@company.com')
    expect(passwordInput).toHaveValue('Password123!')
  })

  it('shows password policy error', async () => {
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'jane@company.com')
    await user.type(passwordInput, 'Short1!') // Invalid password (only 7 characters)
    await user.click(createAccountButton)
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(createAccountButton).not.toBeDisabled()
  })

  it('shows free email provider error', async () => {
    // Mock module inside test with specific behavior
    vi.mocked(getEmailDomain).mockReturnValue('gmail.com')
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'jane@gmail.com')
    await user.type(passwordInput, 'Password123!')
    await user.click(createAccountButton)
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(createAccountButton).not.toBeDisabled()
  })

  it('shows rate limit error', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
      headers: new Headers(),
      redirected: false,
      statusText: 'Too Many Requests',
      type: 'basic',
      url: '',
      clone: vi.fn(),
      body: null,
      bodyUsed: false,
      arrayBuffer: vi.fn(),
      blob: vi.fn(),
      formData: vi.fn(),
      text: vi.fn()
    } as unknown as Response))
    global.fetch = fetchMock // Mock only for this test
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'jane@company.com')
    await user.type(passwordInput, 'Password1234!') // Meets password policy
    await user.click(createAccountButton)
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(createAccountButton).not.toBeDisabled()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/rate-limit', expect.any(Object))
  })

  it('shows Supabase signup error', async () => {
    const supabaseMock = {
      auth: {
        signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Email already registered' } })
      }
    }
    vi.mocked(createClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'jane@company.com')
    await user.type(passwordInput, 'Password123!')
    await user.click(createAccountButton)
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(createAccountButton).not.toBeDisabled()
  })

  it('shows "Failed to create account" if no user in authData', async () => {
    const supabaseMock: MockSupabaseClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      }
    }
    vi.mocked(createClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'jane@company.com')
    await user.type(passwordInput, 'Password123!')
    await user.click(createAccountButton)
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(createAccountButton).not.toBeDisabled()
  })

  it('shows unexpected error if fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) // Mock only for this test
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password1234!')
    await user.click(createAccountButton)
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
    expect(createAccountButton).not.toBeDisabled()
  }, 10000)

  it('shows email sent confirmation on successful signup', async () => {
    // Mock Supabase to return a valid user
    const supabaseMock: MockSupabaseClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue({ 
          data: { user: { id: '123', email: 'jane@acme-corporation.com' }, session: null }, 
          error: null 
        })
      }
    }
    vi.mocked(createClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createClient>)
    
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    console.log('Free email providers:', ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'])
    await user.type(emailInput, 'jane@acme-corporation.com')
    await user.type(passwordInput, 'Password12345!') // Meets password policy (12+ characters)
    await user.click(createAccountButton)
    
    expect(await screen.findByRole('heading', { name: /CHECK YOUR EMAIL/i })).toBeInTheDocument()
  }, 10000)

  it('allows retrying email confirmation', async () => {
    render(<SignupPage />)
    const user = userEvent.setup()
    const nameInput = screen.getByLabelText(/FULL NAME/i)
    const emailInput = screen.getByLabelText(/WORK EMAIL/i)
    const passwordInput = screen.getByLabelText(/PASSWORD/i)
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })
    await user.type(nameInput, 'Jane Doe')
    await user.type(emailInput, 'jane@company.com')
    await user.type(passwordInput, 'Password12345!') // Meets password policy (12+ characters)
    await user.click(createAccountButton)
    expect(await screen.findByRole('heading', { name: /CHECK YOUR EMAIL/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'TRY AGAIN' }))
    expect(await screen.findByRole('heading', { name: /CREATE YOUR ACCOUNT/i })).toBeInTheDocument()
    expect(emailInput).toHaveValue('jane@company.com') // Email input should be pre-filled
  }, 10000)
})
