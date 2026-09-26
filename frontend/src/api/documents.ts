import apiClient from './axios';
import type { Document } from '../types';

export const documents = {
  uploadDocument: async (formData: FormData): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  registerDocumentJson: async (data: any): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents/register', data);
    return response.data;
  },

  getDocuments: async (parcelId: string): Promise<Document[]> => {
    const response = await apiClient.get<Document[]>(`/documents/`, {
      params: { parcel_id: parcelId },
    });
    return response.data;
  },
};
