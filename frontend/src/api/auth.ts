import apiClient from './axios';
import type { LoginCredentials, RegisterData, Token, User } from '../types';

export const auth = {
  login: async (credentials: LoginCredentials): Promise<Token> => {
    const response = await apiClient.post<Token>('/auth/login', {
      username: credentials.username,
      password: credentials.password,
    });
    return response.data;
  },

  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
