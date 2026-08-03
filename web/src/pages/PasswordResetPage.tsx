import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-2">Reset Password</h2>
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 text-center mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 p-3 rounded-lg mb-4">
            Password reset email sent! Please check your inbox and follow the instructions.
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
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
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-sm font-normal leading-normal text-primary-600 dark:text-primary-400 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
