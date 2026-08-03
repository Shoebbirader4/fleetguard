import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Provide user-friendly error messages
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw authError;
      }

      if (data.user && data.session) {
        // Fetch user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          throw new Error('Failed to load user profile. Please contact support.');
        }

        // Store user data in auth store
        setAuth(
          {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            role: profile.role,
            tenantId: profile.tenant_id,
          },
          data.session.access_token
        );

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">FleetGuard AI</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg mb-4 text-sm font-normal leading-normal">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={loading}
              />
              <span className="ml-2 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                Remember me
              </span>
            </label>

            <Link
              to="/password-reset"
              className="text-sm font-normal leading-normal text-primary-600 dark:text-primary-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Sign Up
            </Link>
          </p>
          <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-4">
            Demo credentials will be provided by your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
