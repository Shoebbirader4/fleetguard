import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { setAuth, clearAuth } = useAuthStore();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    email: string;
    role: string;
    full_name?: string;
    expires_at: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setVerifying(false);
      return;
    }

    // Verify invitation token exists and is valid
    const verifyToken = async () => {
      try {
        const { data, error } = await supabase
          .from('user_invitations')
          .select('email, role, full_name, expires_at, status')
          .eq('invitation_token', token)
          .eq('status', 'pending')
          .single();

        if (error || !data) {
          setError('Invalid or expired invitation');
          setVerifying(false);
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired');
          setVerifying(false);
          return;
        }

        setInvitationData(data);
        
        // Pre-fill full name if available
        if (data.full_name) {
          setFormData(prev => ({
            ...prev,
            fullName: data.full_name,
          }));
        }
      } catch (err) {
        setError('Failed to verify invitation');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (password: string): { valid: boolean; message: string } => {
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validation
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

    try {
      if (!invitationData) {
        throw new Error('Invitation data not available');
      }

      // Step 1: Check if user already exists
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('email', invitationData.email)
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      // Step 2: Get invitation details including tenant_id
      const { data: invitation } = await supabase
        .from('user_invitations')
        .select('id, tenant_id, role')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (!invitation) {
        throw new Error('Invalid invitation');
      }

      // Step 3: Create auth user with Supabase signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            tenant_id: invitation.tenant_id,
            role: invitation.role,
          },
          emailRedirectTo: `${window.location.origin}/welcome`,
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw new Error(signUpError.message || 'Failed to create account');
      }

      if (!signUpData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 4: Create user profile (trigger might create it, but we'll try directly too)
      const { error: profileError } = await supabase.from('users').upsert({
        id: signUpData.user.id,
        tenant_id: invitation.tenant_id,
        email: invitationData.email,
        full_name: formData.fullName,
        role: invitation.role,
        notification_preferences: {
          due_soon: ['email'],
          overdue: ['email', 'push'],
          critical_failure_risk: ['email', 'push'],
          safety_risk: ['email', 'push'],
          low_stock: ['email'],
          document_expiry: ['email'],
          document_expired: ['email', 'push'],
          tire_replacement_forecast: ['email'],
        },
        theme: 'light',
        locale: 'en',
        is_active: true,
      }, {
        onConflict: 'id',
      });

      if (profileError) {
        console.warn('Profile creation warning:', profileError);
        // Don't fail - trigger might have created it
      }

      // Step 5: Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.warn('Invitation update warning:', updateError);
        // Don't fail - account is created
      }

      // Step 6: Fetch the complete user profile from database
      const { data: userProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', signUpData.user.id)
        .single();

      if (fetchError || !userProfile) {
        console.error('Failed to fetch user profile:', fetchError);
        throw new Error('Account created but failed to load profile. Please try logging in.');
      }

      // Step 7: CRITICAL - Clear any cached auth state and set new user's auth
      clearAuth(); // Clear old cached data first
      
      // Get the session to get access token
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        // Set auth state with the NEW user's data
        setAuth(
          {
            id: userProfile.id,
            email: userProfile.email,
            fullName: userProfile.full_name,
            role: userProfile.role,
            tenantId: userProfile.tenant_id,
          },
          sessionData.session.access_token
        );
      }

      // Success!
      setSuccess(true);
      
      // User is already logged in from signUp, redirect to welcome page
      setTimeout(() => {
        navigate('/welcome');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
      console.error('Join error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (!token || (error && !invitationData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="card max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {error || 'The invitation link is invalid or has expired.'}
            </p>
          </div>
          <Link to="/login" className="btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

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
              Your account has been created successfully.
            </p>
          </div>
          <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400 mb-4">
            Redirecting you to your dashboard...
          </p>
          <Link to="/welcome" className="btn-primary">
            Continue to Welcome
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Join Your Team</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
            You've been invited to join FleetGuard AI
          </p>
          {invitationData && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm font-normal leading-normal text-gray-700 dark:text-gray-300">
                <span className="font-medium">Email:</span> {invitationData.email}
              </p>
              {invitationData.full_name && (
                <p className="text-sm font-normal leading-normal text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Name:</span> {invitationData.full_name}
                </p>
              )}
              <p className="text-sm font-normal leading-normal text-gray-700 dark:text-gray-300">
                <span className="font-medium">Role:</span> {invitationData.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg mb-4 text-sm font-normal leading-normal">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
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
              placeholder={invitationData?.full_name || "John Doe"}
              required
              disabled={loading}
            />
            {invitationData?.full_name && (
              <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
                Pre-filled from invitation. You can change this if needed.
              </p>
            )}
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
      </div>
    </div>
  );
}
