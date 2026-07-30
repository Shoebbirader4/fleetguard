import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/**
 * Hook to manage authentication state and session monitoring
 */
export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth, logout, checkSession } = useAuthStore();
  const navigate = useNavigate();

  // Function to refresh user data from the database
  const refreshUser = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('No active session');
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.session.user.id)
        .single();

      if (error) throw error;

      setAuth(
        {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          tenantId: profile.tenant_id,
        },
        session.session.access_token
      );
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Check initial session
    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if (event === 'SIGNED_IN' && session) {
        // User signed in
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          setAuth(
            {
              id: profile.id,
              email: profile.email,
              fullName: profile.full_name,
              role: profile.role,
              tenantId: profile.tenant_id,
            },
            session.access_token
          );
        } catch (error) {
          console.error('Error loading user profile:', error);
          clearAuth();
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        clearAuth();
        navigate('/login');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token was refreshed, update access token
        if (user) {
          setAuth(user, session.access_token);
        }
      } else if (event === 'USER_UPDATED' && session) {
        // User data was updated
        if (user) {
          setAuth(user, session.access_token);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession, setAuth, clearAuth, navigate, user]);

  return {
    user,
    isAuthenticated,
    logout,
    checkSession,
    refreshUser,
  };
}
