import apiClient from './axios';
import type { Verification } from '../types';

export interface VerificationCreateData {
  parcel_id: string;
  case_id?: string;
  action_taken: string;
  notes: string;
  status: string;
  verified_by?: string;
}

export const verification = {
  submitVerification: async (data: VerificationCreateData): Promise<Verification> => {
    const response = await apiClient.post<Verification>('/verification', data);
    return response.data;
  },

  getVerifications: async (parcelId: string): Promise<Verification[]> => {
    const response = await apiClient.get<Verification[]>(`/verification/${parcelId}`);
    return response.data;
  },

  getAllVerifications: async (params?: {
    parcel_id?: string;
    case_id?: string;
    status?: string;
    limit?: number;
    skip?: number;
  }): Promise<Verification[]> => {
    const response = await apiClient.get<Verification[]>('/verification', { params });
    return response.data;
  },
};

