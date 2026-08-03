import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid reset token
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link, they can now update password
      } else if (event === 'SIGNED_IN') {
        // Password updated successfully
        navigate('/login');
      }
    });
  }, [navigate]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];

    if (pwd.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    // Validate password
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // Success - user will be redirected by auth state change listener
      // Show success message briefly
      alert('Password updated successfully! Redirecting to login...');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-2">Update Password</h2>
        <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 text-center mb-6">
          Enter your new password below.
        </p>

        {error && (
          <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 p-3 rounded-lg mb-4">
            <p className="font-semibold mb-1">Password requirements:</p>
            <ul className="list-disc list-inside text-sm font-normal leading-normal space-y-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="label">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter new password"
              required
              disabled={loading}
              minLength={12}
            />
            <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
              Must be at least 12 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="Confirm new password"
              required
              disabled={loading}
              minLength={12}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
