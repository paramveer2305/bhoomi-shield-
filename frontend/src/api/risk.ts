import apiClient from './axios';
import type { RiskAnalysis } from '../types';

export const risk = {
  getRiskAnalysis: async (parcelId: string): Promise<RiskAnalysis> => {
    const response = await apiClient.get<RiskAnalysis>(`/risk/${parcelId}`);
    return response.data;
  },

  analyzeRisk: async (parcelId: string, payload?: any): Promise<RiskAnalysis> => {
    const response = await apiClient.post<RiskAnalysis>(`/risk/${parcelId}/analyze`, payload || {});
    return response.data;
  },
};
