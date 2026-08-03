/**
 * TeamSummaryWidget Component
 * 
 * Displays team summary for company owners.
 * Shows total users, breakdown by role, and recent activity.
 * 
 * Task 23.6 - Create additional role-specific widgets (Team Summary)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UsersIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../LoadingSpinner';
import type { UserRole } from '../../types/user';

interface TeamStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
  recentInvitations: number;
}

/**
 * TeamSummaryWidget displays team overview
 * 
 * **Validates: Requirements 8.1, 8.2**
 * - Display team statistics for company owners
 * - Show breakdown by role and activity status
 */
export default function TeamSummaryWidget() {
  const user = useAuthStore((state) => state.user);
  const tenantId = user?.tenantId || '';

  const { data: stats, isLoading, error } = useQuery<TeamStats>({
    queryKey: ['team-summary', tenantId],
    queryFn: async () => {
      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('tenant_id', tenantId);
      
      if (usersError) throw usersError;

      // Fetch recent invitations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: invitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .is('accepted_at', null);
      
      if (invitationsError) throw invitationsError;

      // Calculate stats
      const byRole: Record<string, number> = {};
      let active = 0;
      let inactive = 0;

      (users || []).forEach((u) => {
        byRole[u.role] = (byRole[u.role] || 0) + 1;
        if (u.is_active) {
          active++;
        } else {
          inactive++;
        }
      });

      return {
        total: users?.length || 0,
        active,
        inactive,
        byRole: byRole as Record<UserRole, number>,
        recentInvitations: invitations?.length || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Auto-refresh every 5 minutes (Requirement 8.4)
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 text-center">
        <div className="text-red-600 dark:text-red-400">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm font-normal leading-normal">Failed to load team summary</p>
          <p className="text-xs font-normal leading-tight text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    company_owner: 'Owner',
    fleet_manager: 'Fleet Manager',
    workshop_manager: 'Workshop Manager',
    maintenance_engineer: 'Engineer',
    mechanic: 'Mechanic',
    driver: 'Driver',
    inspector: 'Inspector',
    accountant: 'Accountant',
    auditor: 'Auditor',
  };

  // Get top roles by count
  const topRoles = Object.entries(stats?.byRole || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Total Team Members */}
      <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
        <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-lg">
          <UsersIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.total || 0}
          </p>
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">Total Team Members</p>
        </div>
      </div>

      {/* Active/Inactive Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
          <p className="text-xs font-normal leading-tight text-green-600 dark:text-green-400 font-medium mb-1">
            Active
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {stats?.active || 0}
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 font-medium mb-1">
            Inactive
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {stats?.inactive || 0}
          </p>
        </div>
      </div>

      {/* Pending Invitations */}
      {stats?.recentInvitations !== undefined && stats.recentInvitations > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Pending Invitations
              </p>
              <p className="text-xs font-normal leading-tight text-gray-600 dark:text-gray-400 mt-1">
                Last 30 days
              </p>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.recentInvitations}
            </p>
          </div>
        </div>
      )}

      {/* Role Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Team by Role
        </h4>
        <div className="space-y-2">
          {topRoles.map(([role, count]) => (
            <div
              key={role}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-normal leading-normal text-gray-700 dark:text-gray-300">
                  {roleLabels[role] || role}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Link
          to="/team"
          className="block w-full text-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
        >
          Manage Team
        </Link>
        <Link
          to="/team"
          className="block text-center text-xs font-normal leading-tight text-blue-600 dark:text-blue-400 hover:underline"
        >
          Invite new team member →
        </Link>
      </div>
    </div>
  );
}
