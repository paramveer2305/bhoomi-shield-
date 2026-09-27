import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['citizen', 'officer', 'admin'] },
    { name: 'Parcels', href: '/parcels', icon: MapPin, roles: ['citizen', 'officer', 'admin'] },
    { name: 'Cases', href: '/cases', icon: Briefcase, roles: ['officer', 'admin'] },
    { name: 'Alerts', href: '/alerts', icon: AlertTriangle, roles: ['citizen', 'officer', 'admin'] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #eef2ff 50%, #ecfdf5 100%)' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white/95 backdrop-blur-xl shadow-elevated border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Bhoomi Shield
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    active
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${active ? '' : 'group-hover:scale-110 transition-transform duration-200'}`} />
                  {item.name}
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 capitalize flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-accent-500 rounded-full"></span>
                  {user?.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl shadow-soft border-b border-gray-200/50">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:flex lg:items-center lg:justify-between">
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-gray-900">
                  {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <NotificationCenter />
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
