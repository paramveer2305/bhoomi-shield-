import apiClient from './axios';

export interface DashboardStats {
  total_parcels: number;
  active_alerts: number;
  risk_analyses: number;
  verifications: number;
}

export const stats = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/stats/dashboard');
    return response.data;
  },
};
