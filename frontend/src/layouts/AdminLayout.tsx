import React, { useState } from 'react';
import { Outlet, Link, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from '../components/layout/NotificationCenter';
import {
  LayoutDashboard,
  MapPin,
  Briefcase,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Shield,
  Settings,
  FileText,
  Users,
  Search,
  Home,
  ClipboardList,
  Map,
  BarChart2,
  Settings2,
  User,
  ChevronRight,
  Cpu,
  Database,
  Shield as ShieldIcon,
  Activity,
  Wrench,
  Server,
  Key,
} from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    {
      name: 'System Overview',
      href: '/admin/overview',
      icon: LayoutDashboard,
      description: 'System health and metrics'
    },
    {
      name: 'AI Configurator',
      href: '/admin/ai-config',
      icon: Cpu,
      description: 'Configure risk models and thresholds'
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      description: 'Manage users, roles, and permissions'
    },
    {
      name: 'System Logs',
      href: '/admin/logs',
      icon: Activity,
      description: 'Audit trails and system logs'
    },
    {
      name: 'Database Admin',
      href: '/admin/database',
      icon: Database,
      description: 'Data management and backups'
    },
    {
      name: 'Security Center',
      href: '/admin/security',
      icon: ShieldIcon,
      description: 'Access control and encryption'
    },
    {
      name: 'Integrations',
      href: '/admin/integrations',
      icon: Server,
      description: 'External API connections'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings2,
      description: 'System configuration'
    },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="p-6 border-b border-border gradient-role-admin relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary-800/10 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">BHOOMI SHIELD</h1>
                <p className="text-white/70 text-xs mt-0.5">System Administration</p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center">
                <User className="w-5 h-5 text-secondary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user?.full_name}</p>
                <Badge variant="role-admin" size="sm">Administrator</Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive: active }) => `
                  flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  group relative overflow-hidden
                  ${active
                    ? 'bg-secondary-100 text-secondary-900 shadow-sm border border-secondary-200'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                  }
                `}
                title={item.description}
              >
                <span className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
                  ${isActive(item.href)
                    ? 'bg-secondary-200 text-secondary-700'
                    : 'text-secondary-400 group-hover:text-secondary-600'
                  }
                `}>
                  <item.icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-secondary-500 truncate group-hover:text-secondary-600 transition-colors">
                    {item.description}
                  </p>
                </div>
                {isActive(item.href) && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-secondary-800 rounded-l-full" />
                )}
              </NavLink>
            ))}
          </nav>

          {/* System Health */}
          <div className="p-4 border-t border-border">
            <div className="text-xs font-medium text-secondary-500 uppercase tracking-wider mb-3">System Health</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="text-sm font-medium text-success-700">API Gateway</span>
                </div>
                <span className="text-xs text-success-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="text-sm font-medium text-success-700">Database</span>
                </div>
                <span className="text-xs text-success-600">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="text-sm font-medium text-success-700">AI Engine</span>
                </div>
                <span className="text-xs text-success-600">Running</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning-500" />
                  <span className="text-sm font-medium text-warning-700">Storage</span>
                </div>
                <span className="text-xs text-warning-600">78% Used</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {}}
            >
              <Wrench className="w-4 h-4" />
              <span>Maintenance Mode</span>
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start gap-3"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden btn-icon btn-ghost"
                aria-label="Toggle navigation"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="hidden sm:block">
                <h2 className="text-xl font-semibold text-foreground">
                  {navigation.find(n => isActive(n.href))?.name || 'System Overview'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {navigation.find(n => isActive(n.href))?.description || 'System administration panel'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationCenter />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary-100 rounded-full">
                <span className="w-2 h-2 rounded-full bg-secondary-500" />
                <span className="text-xs font-medium text-secondary-700">Admin Mode</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;