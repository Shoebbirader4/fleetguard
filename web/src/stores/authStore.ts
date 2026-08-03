import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types/user';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  notification_preferences?: Record<string, string[]>;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),
      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
        }
      },
      checkSession: async () => {
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          // Handle invalid refresh token or no session
          if (sessionError || !session) {
            // Clear invalid session data from storage
            if (sessionError?.message?.includes('refresh') || sessionError?.message?.includes('token')) {
              console.warn('Invalid or expired refresh token, clearing auth state');
              await supabase.auth.signOut({ scope: 'local' }); // Clear local storage only
            }
            get().clearAuth();
            return false;
          }

          // Check if token is expired (24 hour timeout as per requirement)
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);

          if (expiresAt && expiresAt < now) {
            // Token expired, try to refresh
            try {
              const {
                data: { session: newSession },
                error: refreshError,
              } = await supabase.auth.refreshSession();

              if (refreshError || !newSession) {
                console.warn('Failed to refresh session, clearing auth state');
                await supabase.auth.signOut({ scope: 'local' });
                get().clearAuth();
                return false;
              }

              // Update with new session data
              if (newSession.user && get().user) {
                set({
                  accessToken: newSession.access_token,
                });
              }
            } catch (refreshError) {
              console.error('Token refresh error:', refreshError);
              await supabase.auth.signOut({ scope: 'local' });
              get().clearAuth();
              return false;
            }
          }

          return true;
        } catch (error) {
          console.error('Session check error:', error);
          // Clear auth on any error
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (signOutError) {
            console.error('Error during cleanup sign out:', signOutError);
          }
          get().clearAuth();
          return false;
        }
      },
    }),
    {
      name: 'fleetguard-auth',
    }
  )
);
