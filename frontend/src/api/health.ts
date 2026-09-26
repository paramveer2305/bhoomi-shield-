import apiClient from './axios';

interface HealthResponse {
  status: string;
  timestamp: string;
}

export const health = {
  checkHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },
};
