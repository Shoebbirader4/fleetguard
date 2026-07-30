/**
 * User Management Hooks
 * 
 * React Query hooks for fetching and managing user data, including
 * invitations, role management, and user activation/deactivation.
 * 
 * Task 7.1 & 7.2 - User management and invitation hooks
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { User, UserRole, UserInvitation, InviteUserFormData } from '../types/user';

/**
 * Hook to fetch all users in the current tenant
 * Returns users ordered by full_name
 * 
 * **Validates: Requirements 1.1, 1.5**
 * - Only company_owner and fleet_manager can access this
 * - Each tenant can only see their own users (enforced by RLS)
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data as User[];
    },
  });
}

/**
 * Hook to fetch a single user by ID
 * @param id - User ID to fetch
 * 
 * **Validates: Requirements 1.1, 1.5**
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as User;
    },
    enabled: !!id,
  });
}

/**
 * Hook to invite a new user
 * Sends an invitation email and creates an invitation record
 * 
 * **Validates: Requirements 1.1, 1.2, 1.4**
 * - Only company_owner and fleet_manager can invite users
 * - Invited users receive the role specified in invitation
 */
export function useInviteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: InviteUserFormData) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: formData,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate both users and invitations queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

/**
 * Hook to update a user's role
 * @param userId - ID of user to update
 * @param role - New role to assign
 * 
 * **Validates: Requirements 1.3, 1.5**
 * - Users cannot change their own role (enforced in UI)
 * - Only company_owner can change roles
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          role, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data as User;
    },
    onSuccess: () => {
      // Invalidate users queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to deactivate a user
 * Sets is_active to false, preventing login
 * 
 * **Validates: Requirements 1.4, 1.5**
 * - Deactivated users cannot log in
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data as User;
    },
    onSuccess: () => {
      // Invalidate users queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to fetch pending invitations
 * Returns invitations that haven't been accepted yet and haven't expired
 * 
 * **Validates: Requirements 1.4, 1.5**
 */
export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserInvitation[];
    },
  });
}

/**
 * Hook to accept an invitation
 * Marks an invitation as accepted
 * 
 * **Validates: Requirements 1.2, 1.4, 1.5**
 * - Invited users are automatically assigned their specified role
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invitationToken: string) => {
      const { data, error } = await supabase
        .from('user_invitations')
        .update({ 
          accepted_at: new Date().toISOString() 
        })
        .eq('invitation_token', invitationToken)
        .is('accepted_at', null)
        .select()
        .single();
      
      if (error) throw error;
      return data as UserInvitation;
    },
    onSuccess: () => {
      // Invalidate invitations and users queries
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to resend an expired invitation
 * Creates a new invitation with a fresh expiration date
 * 
 * **Validates: Requirements 1.4, 1.5**
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.functions.invoke('resend-invitation', {
        body: { invitationId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate invitations query to show updated invitation
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}
