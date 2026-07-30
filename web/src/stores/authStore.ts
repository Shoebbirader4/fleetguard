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
          } = await supabase.auth.getSession();

          if (!session) {
            get().clearAuth();
            return false;
          }

          // Check if token is expired (24 hour timeout as per requirement)
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);

          if (expiresAt && expiresAt < now) {
            // Token expired, try to refresh
            const {
              data: { session: newSession },
              error,
            } = await supabase.auth.refreshSession();

            if (error || !newSession) {
              get().clearAuth();
              return false;
            }

            // Update with new session data
            if (newSession.user && get().user) {
              set({
                accessToken: newSession.access_token,
              });
            }
          }

          return true;
        } catch (error) {
          console.error('Session check error:', error);
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
