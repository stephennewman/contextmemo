import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

// Mock global.fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockFrom = vi.fn((tableName: string) => {
  if (tableName === 'tenants') {
    return { update: mockUpdate, eq: mockEq };
  }
  return { update: mockUpdate, eq: mockEq }; // Default for other tables if needed
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
    from: mockFrom,
  })),
}));

// Mock Next.js useRouter
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));


describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test
    // Reset process.env if needed, though for this component, it's less critical
    // as createClient is already mocked.
  });

  afterEach(() => {
    // Restore original fetch after all tests if necessary, though Vitest handles this well
    mockFetch.mockRestore();
  });

  it('renders the login form correctly', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /WELCOME BACK/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/EMAIL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PASSWORD/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SIGN IN/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SIGN UP/i })).toBeInTheDocument();
  });

  it('handles email and password input changes', async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('shows loading state on form submission', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    // Mock successful login for the Supabase call
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockEq.mockResolvedValueOnce({ error: null }); // Mock for the update call

    render(<LoginPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const signInButton = screen.getByRole('button', { name: /SIGN IN/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.click(signInButton);

    expect(signInButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /SIGN IN/i })).toContainHTML('lucide lucide-loader-circle'); // Check for Loader2 icon's SVG class
  });

  it('shows rate limit error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    render(<LoginPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const signInButton = screen.getByRole('button', { name: /SIGN IN/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Too many attempts. Please wait and try again.')).toBeInTheDocument();
    });
    expect(signInButton).not.toBeDisabled();
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/rate-limit', expect.any(Object));
  });

  it('shows Supabase login error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid credentials' } });

    render(<LoginPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const signInButton = screen.getByRole('button', { name: /SIGN IN/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
    expect(signInButton).not.toBeDisabled();
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
  });

  it('redirects to dashboard on successful login', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockEq.mockResolvedValueOnce({ error: null }); // Mock for the update call

    render(<LoginPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const signInButton = screen.getByRole('button', { name: /SIGN IN/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(signInButton).toBeDisabled(); // Should remain disabled during navigation
  });

  it('shows unexpected error if fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error')); // Simulate network error

    render(<LoginPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const signInButton = screen.getByRole('button', { name: /SIGN IN/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
    expect(signInButton).not.toBeDisabled();
  });

  it('shows unexpected error if Supabase update fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockEq.mockImplementationOnce(() => { throw new Error('DB Update failed'); }); // Simulate update error by throwing

    render(<LoginPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/EMAIL/i);
    const passwordInput = screen.getByLabelText(/PASSWORD/i);
    const signInButton = screen.getByRole('button', { name: /SIGN IN/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    fireEvent.click(signInButton);

    await screen.findByText('An unexpected error occurred'); // Explicitly wait for the error message
    expect(signInButton).not.toBeDisabled();
  });
});
