import apiClient from './axios';
import type { Case } from '../types';

interface GetCasesParams {
  skip?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assigned_to?: string;
  parcel_id?: string;
}

export const cases = {
  getCases: async (params?: GetCasesParams): Promise<Case[]> => {
    const response = await apiClient.get<Case[]>('/cases/', { params });
    return response.data;
  },

  getCase: async (id: string): Promise<Case> => {
    const response = await apiClient.get<Case>(`/cases/${id}`);
    return response.data;
  },

  createCase: async (data: Omit<Case, 'case_id' | 'created_at' | 'updated_at'>): Promise<Case> => {
    const response = await apiClient.post<Case>('/cases/', data);
    return response.data;
  },

  updateCase: async (id: string, data: Partial<Case>): Promise<Case> => {
    const response = await apiClient.patch<Case>(`/cases/${id}`, data);
    return response.data;
  },
};
