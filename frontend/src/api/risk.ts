import apiClient from './axios';
import type { RiskAnalysis } from '../types';

export const risk = {
  getRiskAnalysis: async (parcelId: string): Promise<RiskAnalysis> => {
    const response = await apiClient.get<RiskAnalysis>(`/risk/${parcelId}`);
    return response.data;
  },

  analyzeRisk: async (parcelId: string, payload?: any): Promise<RiskAnalysis> => {
    const response = await apiClient.post<RiskAnalysis>(`/risk/analyze/${parcelId}`, payload || {});
    return response.data;
  },

  getRiskHistory: async (parcelId: string): Promise<RiskAnalysis[]> => {
    const response = await apiClient.get<RiskAnalysis[]>(`/risk/${parcelId}/history`);
    return response.data;
  },
};
