import apiClient from './axios';
import type { Alert } from '../types';

interface GetAlertsParams {
  skip?: number;
  limit?: number;
  severity?: string;
  status?: string;
  parcel_id?: string;
}

export const alerts = {
  getAlerts: async (params?: GetAlertsParams): Promise<Alert[]> => {
    const response = await apiClient.get<Alert[]>('/alerts', { params });
    return response.data;
  },

  createAlert: async (data: Omit<Alert, 'alert_id' | 'created_at' | 'updated_at'>): Promise<Alert> => {
    const response = await apiClient.post<Alert>('/alerts', data);
    return response.data;
  },

  updateAlert: async (id: string, data: Partial<Alert>): Promise<Alert> => {
    const response = await apiClient.patch<Alert>(`/alerts/${id}`, data);
    return response.data;
  },
};
