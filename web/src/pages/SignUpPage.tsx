import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function SignUpPage() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Check for invitation token and redirect to JoinPage if present
  useEffect(() => {
    const invitationToken = searchParams.get('invitation') || searchParams.get('token');
    if (invitationToken) {
      navigate(`/join?token=${invitationToken}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    // Requirement 28.3: Minimum 12 characters with uppercase, lowercase, numbers, and special chars
    if (password.length < 12) {
      return { valid: false, message: 'Password must be at least 12 characters long' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    return { valid: true, message: '' };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validation
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (!formData.companyName.trim()) {
      setError('Please enter your company name');
      setLoading(false);
      return;
    }

    try {
      // Call the signup edge function which uses service role to bypass RLS
      const response = await supabase.functions.invoke('signup', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          companyName: formData.companyName,
        },
      });

      console.log('Full signup response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);

      // Check for HTTP-level errors
      if (response.error) {
        console.error('Edge function invocation error:', response.error);
        throw new Error(response.error.message || 'Failed to connect to signup service. Please try again.');
      }

      // Check for application-level errors in the response data
      if (response.data && response.data.error) {
        console.error('Application error from edge function:', response.data);
        // Show more detailed error if available
        const errorMessage = response.data.details 
          ? `${response.data.error}\n\nDetails: ${response.data.details}` 
          : response.data.error;
        throw new Error(errorMessage);
      }

      // Verify success
      if (!response.data || !response.data.success) {
        console.error('Unexpected response format:', response.data);
        throw new Error('Unexpected response from server. Please try again.');
      }

      // Success!
      setSuccess(true);
      
      // Auto-login the user after successful account creation
      try {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (loginError) {
          console.error('Auto-login error:', loginError);
          // If auto-login fails, redirect to login page
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Account created successfully! Please sign in with your credentials.' 
              } 
            });
          }, 2000);
        } else {
          // Auto-login successful, redirect to onboarding wizard
          setTimeout(() => {
            navigate('/onboarding');
          }, 2000);
        }
      } catch (loginErr) {
        console.error('Auto-login exception:', loginErr);
        // If auto-login fails, redirect to login page
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Account created successfully! Please sign in with your credentials.' 
            } 
          });
        }, 2000);
      }

    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
      console.error('Sign up error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="card max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your FleetGuard AI account has been created successfully.
            </p>
          </div>
          <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400 mb-4">
            Redirecting you to the login page...
          </p>
          <Link to="/login" className="btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
            Start managing your fleet with FleetGuard AI
          </p>
          <div className="mt-4 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-left text-sm text-lime-800">
            <strong>7-day free trial:</strong> monitor up to 3 vehicles with fleet visibility and component health. No card required.
          </div>
        </div>

        {error && (
          <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg mb-4 text-sm font-normal leading-normal">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="label">
              Full Name <span className="text-danger-600">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleInputChange}
              className="input-field"
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="companyName" className="label">
              Company Name <span className="text-danger-600">*</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={formData.companyName}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Your Company Ltd"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="label">
              Email Address <span className="text-danger-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input-field"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password <span className="text-danger-600">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              disabled={loading}
              minLength={12}
            />
            <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
              Min 12 characters with uppercase, lowercase, numbers & special characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm Password <span className="text-danger-600">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              disabled={loading}
              minLength={12}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 text-center">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
