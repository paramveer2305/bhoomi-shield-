import apiClient from './axios';
import type { Evidence } from '../types';

export interface EvidenceCreatePayload {
  parcel_id: string;
  case_id: string;
  evidence_type: string;
  file_url?: string;
  geo_coordinates?: { latitude?: number; longitude?: number };
  uploaded_by?: string;
  notes?: string;
}

export const evidence = {
  createEvidence: async (data: EvidenceCreatePayload): Promise<Evidence> => {
    const response = await apiClient.post<Evidence>('/evidence', data);
    return response.data;
  },

  getEvidenceByCase: async (caseId: string): Promise<Evidence[]> => {
    const response = await apiClient.get<Evidence[]>(`/evidence/${caseId}`);
    return response.data;
  },

  getAllEvidence: async (params?: { parcel_id?: string; case_id?: string; evidence_type?: string }): Promise<Evidence[]> => {
    const response = await apiClient.get<Evidence[]>('/evidence', { params });
    return response.data;
  },
};
