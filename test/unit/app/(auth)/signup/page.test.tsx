import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/(auth)/signup/page'

// --- Mocks ---
const mockFetch = vi.fn();
const mockSignUp = vi.fn();
const mockGetEmailDomain = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

global.fetch = vi.fn((...args) => mockFetch(...args));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  })),
}));

vi.mock('@/lib/utils/domain-verification', () => ({
  getEmailDomain: (...args: unknown[]) => mockGetEmailDomain(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
  }),
}));

describe('SignupPage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    mockGetEmailDomain.mockReturnValue('company.com');
    mockSignUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders the signup form correctly', async () => {
    render(<SignupPage />);
    expect(screen.getByRole('heading', { name: /CREATE YOUR ACCOUNT/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/FULL NAME/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/WORK EMAIL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PASSWORD/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CREATE ACCOUNT/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SIGN IN/i })).toBeInTheDocument();
  });

  it('handles input changes', async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(/FULL NAME/i);
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    await user.type(nameInput, 'Jane Doe');
    await user.type(emailInput, 'jane@company.com');
    await user.type(passwordInput, 'Password123!');
    expect(nameInput).toHaveValue('Jane Doe');
    expect(emailInput).toHaveValue('jane@company.com');
    expect(passwordInput).toHaveValue('Password123!');
  });

  it('shows password policy error', async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(emailInput, 'jane@company.com');
    await user.type(passwordInput, 'short'); // Invalid password
    await user.click(createAccountButton);
    // screen.debug(); // REMOVED screen.debug()
    await waitFor(() => {
      expect(screen.getByText(/Password must be 12\+ chars and include upper, lower, number, and symbol/i)).toBeInTheDocument();
    });
    expect(createAccountButton).not.toBeDisabled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows free email provider error', async () => {
    mockGetEmailDomain.mockReturnValue('gmail.com'); // Mock only for this test
    render(<SignupPage />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(emailInput, 'jane@gmail.com');
    await user.type(passwordInput, 'Password123!');
    await user.click(createAccountButton);
    await waitFor(() => {
      expect(screen.getByText(/Please use your work email address to sign up/i)).toBeInTheDocument();
    });
    expect(createAccountButton).not.toBeDisabled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows rate limit error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 }); // Mock only for this test
    render(<SignupPage />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(emailInput, 'jane@company.com');
    await user.type(passwordInput, 'Password123!');
    await user.click(createAccountButton);
    await waitFor(() => {
      expect(screen.getByText(/Too many attempts. Please wait and try again\./i)).toBeInTheDocument();
    });
    expect(createAccountButton).not.toBeDisabled();
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/rate-limit', expect.any(Object));
  });

  it('shows Supabase signup error', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Email already registered' } }); // Mock only for this test
    render(<SignupPage />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(emailInput, 'jane@company.com');
    await user.type(passwordInput, 'Password123!');
    await user.click(createAccountButton);
    await waitFor(() => {
      expect(screen.getByText(/Email already registered/i)).toBeInTheDocument();
    });
    expect(createAccountButton).not.toBeDisabled();
    // UPDATED ASSERTION
    expect(mockSignUp).toHaveBeenCalledWith(
      {
        email: 'jane@company.com',
        password: 'Password123!',
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('https://contextmemo.com/auth/callback?next=/brands/new'),
          data: expect.objectContaining({
            name: expect.any(String),
            email_domain: expect.stringContaining('company.com'),
          }),
        }),
      }
    );
  });

  it('shows "Failed to create account" if no user in authData', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: null }, error: null }); // Mock only for this test
    render(<SignupPage />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(emailInput, 'jane@company.com');
    await user.type(passwordInput, 'Password123!');
    await user.click(createAccountButton);
    await waitFor(() => {
      expect(screen.getByText(/Failed to create account/i)).toBeInTheDocument();
    });
    expect(createAccountButton).not.toBeDisabled();
  });

  it('shows unexpected error if fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error')); // Mock only for this test
    render(<SignupPage />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123!');
    await user.click(createAccountButton);
    await waitFor(() => {
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
    });
    expect(createAccountButton).not.toBeDisabled();
  });

  it('shows email sent confirmation on successful signup', async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(/FULL NAME/i);
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(nameInput, 'Jane Doe');
    await user.type(emailInput, 'jane@company.com');
    await user.type(passwordInput, 'Password123!');
    await user.click(createAccountButton);
    expect(await screen.findByRole('heading', { name: /CHECK YOUR EMAIL/i })).toBeInTheDocument();
    expect(screen.getByText(/We've sent a confirmation link to/i)).toBeInTheDocument();
    expect(screen.getByText('jane@company.com')).toBeInTheDocument();
    expect(screen.getByText(/Your price: FREE locked in forever/i)).toBeInTheDocument();
    expect(screen.getByText('Confirmation link expires in 24 hours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TRY AGAIN' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SIGN IN/i })).toBeInTheDocument();
  });

  it('allows retrying email confirmation', async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(/FULL NAME/i);
    const emailInput = screen.getByLabelText(/WORK EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const createAccountButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i });
    await user.type(nameInput, 'Jane Doe');
    await user.type(emailInput, 'jane@company.com');
    await user.type(passwordInput, 'Password123!');
    await user.click(createAccountButton);
    expect(await screen.findByRole('heading', { name: /CHECK YOUR EMAIL/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'TRY AGAIN' }));
    expect(await screen.findByRole('heading', { name: /CREATE YOUR ACCOUNT/i })).toBeInTheDocument();
    expect(emailInput).toHaveValue('jane@company.com'); // Email input should be pre-filled
  });
});
