import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: string | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  tenantId: null,
  isLoading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session && data.user) {
        // Fetch user profile to get role and tenant_id
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        set({
          user: data.user,
          session: data.session,
          role: profile.role,
          tenantId: profile.tenant_id,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Sign in failed',
        isLoading: false,
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        user: null,
        session: null,
        role: null,
        tenantId: null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Sign out failed',
        isLoading: false,
      });
      throw error;
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        set({
          user: session.user,
          session: session,
          role: profile.role,
          tenantId: profile.tenant_id,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role, tenant_id')
            .eq('id', session.user.id)
            .single();

          set({
            user: session.user,
            session: session,
            role: profile?.role || null,
            tenantId: profile?.tenant_id || null,
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            user: null,
            session: null,
            role: null,
            tenantId: null,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
