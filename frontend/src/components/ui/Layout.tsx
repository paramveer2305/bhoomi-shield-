import React from 'react';
import type { User } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex">
      {children}
    </div>
  );
};

interface SidebarProps {
  user: User | null;
  navigation: { name: string; href: string; icon: string }[];
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, navigation, onLogout }) => {
  return (
    <aside className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 -translate-x-full">
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-primary-600">BHOOMI-SHIELD</h1>
          <p className="text-xs text-secondary-500 mt-1">Land Dispute Early Warning</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary-600 hover:bg-secondary-100 hover:text-primary-600 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </a>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border">
          {user && (
            <div className="mb-3">
              <p className="font-medium text-sm text-foreground">{user.name || user.full_name || user.username}</p>
              <p className="text-xs text-secondary-500">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 capitalize">
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-secondary-600 hover:bg-secondary-100 hover:text-destructive rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground hidden sm:block">
            Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-secondary-50 rounded-lg">
            <span className="text-sm text-secondary-600">{user?.name || user?.full_name || user?.username}</span>
          </div>
        </div>
      </div>
    </header>
  );
};