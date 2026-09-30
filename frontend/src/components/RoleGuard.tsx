import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import CitizenLayout from '../layouts/CitizenLayout';
import OfficerLayout from '../layouts/OfficerLayout';

export type { UserRole };

interface RoleRouteConfig {
  layout: React.ComponentType;
  basePath: string;
  allowedRoles: UserRole[];
  redirectPath?: string;
}

// Two-role architecture: Citizen and Officer
const ROLE_ROUTES: RoleRouteConfig[] = [
  {
    layout: CitizenLayout,
    basePath: '/citizen',
    allowedRoles: ['citizen'],
    redirectPath: '/citizen/portfolio',
  },
  {
    layout: OfficerLayout,
    basePath: '/officer',
    allowedRoles: ['officer'],
    redirectPath: '/officer/dashboard',
  },
];

export const normalizeRole = (role?: string): UserRole => {
  const r = (role || 'citizen').toLowerCase();
  return ['officer', 'patwari', 'tehsildar', 'revenue_officer', 'field_patwari', 'admin'].includes(r)
    ? 'officer'
    : 'citizen';
};

export const getRoleRouteConfig = (role: UserRole | string, pathname?: string): RoleRouteConfig | undefined => {
  const normRole = normalizeRole(role);
  if (pathname) {
    const matched = ROLE_ROUTES.find(config => config.allowedRoles.includes(normRole) && pathname.startsWith(config.basePath));
    if (matched) return matched;
  }
  return ROLE_ROUTES.find(config => config.allowedRoles.includes(normRole));
};

export const getDashboardPathForRole = (role: UserRole | string): string => {
  const normRole = normalizeRole(role);
  return normRole === 'officer' ? '/officer/dashboard' : '/citizen/portfolio';
};

export const isPathAllowedForRole = (pathname: string, role: UserRole | string): boolean => {
  const normRole = normalizeRole(role);
  const allowedConfigs = ROLE_ROUTES.filter(config => config.allowedRoles.includes(normRole));
  if (allowedConfigs.length === 0) return false;

  // Allow access to any allowed basePath for this role
  if (allowedConfigs.some(config => pathname.startsWith(config.basePath))) return true;

  // Allow parcel routes for all authenticated roles inside their respective layout
  if (pathname.startsWith('/parcels')) return true;

  // Allow cases for officers
  if (pathname.startsWith('/cases') && normRole === 'officer') {
    return true;
  }

  // Allow legacy redirect paths for officers to avoid broken links
  if ((pathname.startsWith('/patwari') || pathname.startsWith('/tehsildar') || pathname.startsWith('/admin')) && normRole === 'officer') {
    return true;
  }

  // Allow alerts for all authenticated roles
  if (pathname.startsWith('/alerts')) return true;

  // Allow access to public/auth paths
  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/unauthorized')) {
    return true;
  }

  return false;
};

// Role-based guard component
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary-600 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If specific roles are required, check them
  if (allowedRoles && user && !allowedRoles.includes(normalizeRole(user.role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Dynamic role-based layout wrapper
export const RoleBasedLayout: React.FC = () => {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary-600 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const config = getRoleRouteConfig(user.role, location.pathname);

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-secondary-600 mb-6">Your role "<span className="font-medium">{user.role}</span>" does not have a configured portal.</p>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="btn-primary"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Check if current path is allowed for this role
  const isAllowed = isPathAllowedForRole(location.pathname, user.role);

  if (!isAllowed && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
    // Redirect to role-appropriate dashboard
    return <Navigate to={config.redirectPath!} replace />;
  }

  // Render the appropriate layout dynamically
  const LayoutComponent = config.layout as unknown as React.ComponentType;

  return <LayoutComponent />;
};

// Public route guard (for login/register pages)
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect authenticated users to their role dashboard
    const { user } = useAuth();
    if (user) {
      const dashboardPath = getDashboardPathForRole(user.role);
      return <Navigate to={dashboardPath} replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Hook for checking permissions in components
export const useRolePermissions = () => {
  const { user } = useAuth();
  const currentRole = normalizeRole(user?.role);

  const canAccess = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(currentRole);
  };

  const isRole = (role: UserRole): boolean => {
    return currentRole === role;
  };

  const getDashboardPath = (): string => {
    if (!user) return '/login';
    return getDashboardPathForRole(currentRole);
  };

  return { canAccess, isRole, getDashboardPath, userRole: currentRole };
};

export default RoleGuard;