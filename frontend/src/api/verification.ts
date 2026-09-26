import apiClient from './axios';
import type { Verification } from '../types';

export const verification = {
  submitVerification: async (data: Omit<Verification, 'verification_id' | 'timestamp'>): Promise<Verification> => {
    const response = await apiClient.post<Verification>('/verification/', data);
    return response.data;
  },

  getVerifications: async (parcelId: string): Promise<Verification[]> => {
    const response = await apiClient.get<Verification[]>(`/verification/parcel/${parcelId}`);
    return response.data;
  },
};
