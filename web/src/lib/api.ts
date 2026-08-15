import axios from './axios';
import { supabase } from './supabase';

async function invoke<T>(functionName: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: body || {},
  });
  if (error) throw error;
  return data as T;
}

export const costReportingApi = {
  async getSummary(params: Record<string, unknown> = {}) {
    return invoke('cost-reporting', params);
  },
  async getCosts(params: Record<string, unknown> = {}) {
    return invoke('cost-reporting', params);
  },
};

export const maintenanceCalendarApi = {
  async getEvents(params: Record<string, unknown> = {}) {
    return invoke('maintenance-calendar', params);
  },
};

export const gdprApi = {
  async requestDataExport(): Promise<{ success: boolean; message?: string; downloadUrl?: string }> {
    return invoke('gdpr-data-export');
  },
  async requestAccountDeletion(reason: string) {
    return invoke<{ success: boolean; message?: string }>('gdpr-account-deletion', { reason });
  },
};

export const securityApi = {
  async getLockedAccounts(): Promise<Array<Record<string, unknown>>> {
    return invoke('security-locked-accounts');
  },
  async getAuthAttempts(params: Record<string, unknown> = {}): Promise<Array<Record<string, unknown>>> {
    return invoke('security-auth-attempts', params);
  },
  async unlockAccount(email: string, reason: string) {
    return invoke('security-unlock-account', { email, reason });
  },
};

export { axios };
