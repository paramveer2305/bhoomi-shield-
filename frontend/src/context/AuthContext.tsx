import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { auth } from '../api/auth';
import type { User, LoginCredentials, RegisterData } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 2500);

    const normalizeUser = (data: any): User => {
      const roleStr = (data?.role || 'citizen').toLowerCase();
      const role: UserRole = ['officer', 'patwari', 'tehsildar', 'revenue_officer', 'field_patwari', 'admin'].includes(roleStr)
        ? 'officer'
        : 'citizen';
      return { ...data, role };
    };

    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await auth.getMe();
          if (isMounted) setUser(normalizeUser(userData));
        } catch {
          localStorage.removeItem('access_token');
        }
      }
      if (isMounted) setIsLoading(false);
      clearTimeout(timeoutId);
    };

    initAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const tokenData = await auth.login(credentials);
      localStorage.setItem('access_token', tokenData.access_token);
      const userData = await auth.getMe();
      const roleStr = (userData?.role || tokenData.role || 'citizen').toLowerCase();
      const role: UserRole = ['officer', 'patwari', 'tehsildar', 'revenue_officer', 'field_patwari', 'admin'].includes(roleStr)
        ? 'officer'
        : 'citizen';
      setUser({ ...userData, role });
    } catch (error: any) {
      const message =
        error?.message ||
        error?.error?.message ||
        (typeof error === 'string' ? error : 'Authentication failed. Please check your credentials.');
      throw new Error(message);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await auth.register(data);
    } catch (error: any) {
      const message =
        error?.message ||
        error?.error?.message ||
        (typeof error === 'string' ? error : 'Registration failed. Please check your details.');
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
