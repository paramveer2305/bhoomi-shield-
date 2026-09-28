import apiClient from './axios';
import type { Parcel, ParcelEvent } from '../types';

interface GetParcelsParams {
  skip?: number;
  limit?: number;
  status?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  owner_name?: string;
}

export const parcels = {
  getParcels: async (params?: GetParcelsParams): Promise<Parcel[]> => {
    const response = await apiClient.get<Parcel[]>('/parcels', { params });
    return response.data;
  },

  getParcel: async (id: string): Promise<Parcel> => {
    const response = await apiClient.get<Parcel>(`/parcels/${id}`);
    return response.data;
  },

  createParcel: async (data: Omit<Parcel, 'parcel_id' | 'created_at' | 'updated_at'>): Promise<Parcel> => {
    const response = await apiClient.post<Parcel>('/parcels', data);
    return response.data;
  },

  updateParcel: async (id: string, data: Partial<Parcel>): Promise<Parcel> => {
    const response = await apiClient.put<Parcel>(`/parcels/${id}`, data);
    return response.data;
  },

  getTimeline: async (id: string): Promise<ParcelEvent[]> => {
    const response = await apiClient.get<ParcelEvent[]>(`/parcels/${id}/timeline`);
    return response.data;
  },

  exportReport: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/parcels/${id}/export`);
    return response.data;
  },

  initiateVerification: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/parcels/${id}/initiate-verification`);
    return response.data;
  },
};
