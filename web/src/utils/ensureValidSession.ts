/**
 * Utility to ensure the Supabase session is valid before making authenticated requests
 */

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export async function ensureValidSession(): Promise<boolean> {
  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      // Clear auth store and redirect to login
      useAuthStore.getState().clearAuth();
      return false;
    }

    if (!sessionData.session) {
      console.warn('No active session found');
      useAuthStore.getState().clearAuth();
      return false;
    }

    // Check if token is expired
    const expiresAt = sessionData.session.expires_at;
    const now = Math.floor(Date.now() / 1000);

    if (expiresAt && expiresAt < now) {
      console.warn('Session token expired, attempting refresh...');
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !refreshData.session) {
        console.error('Failed to refresh session:', refreshError);
        useAuthStore.getState().clearAuth();
        return false;
      }

      console.log('Session refreshed successfully');
      return true;
    }

    // Session is valid
    return true;
  } catch (error) {
    console.error('Error checking session:', error);
    useAuthStore.getState().clearAuth();
    return false;
  }
}
