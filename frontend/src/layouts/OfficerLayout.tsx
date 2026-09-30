import React, { useState } from 'react';
import { Outlet, Link, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from '../components/layout/NotificationCenter';
import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Shield,
  FileText,
  Search,
  ClipboardCheck,
  Scale,
  Gavel,
  FileCheck,
  TrendingUp,
  Camera,
  User,
  ChevronRight,
} from 'lucide-react';
import { Badge, Button } from '../components/ui';

const OfficerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    {
      name: 'Officer Dashboard',
      href: '/officer/dashboard',
      icon: LayoutDashboard,
      description: 'Unified command center, stats & quick actions',
    },
    {
      name: 'Dispute Cases',
      href: '/officer/cases',
      icon: Gavel,
      description: 'Review and adjudicate land disputes',
    },
    {
      name: 'Field Inspections',
      href: '/officer/inspections',
      icon: ClipboardCheck,
      description: 'Conduct and manage on-site field surveys',
    },
    {
      name: 'Mutation Orders',
      href: '/officer/mutations',
      icon: FileCheck,
      description: 'Review and approve land mutation orders',
    },
    {
      name: 'Parcel Verification',
      href: '/officer/verification',
      icon: Shield,
      description: 'Verify boundary claims and ownership records',
    },
    {
      name: 'Dispute Resolution',
      href: '/officer/resolution',
      icon: Scale,
      description: 'Magisterial resolution bench and proceedings',
    },
    {
      name: 'Evidence & Photos',
      href: '/officer/evidence',
      icon: Camera,
      description: 'Upload and inspect field survey evidence',
    },
    {
      name: 'Risk Analytics',
      href: '/officer/analytics',
      icon: TrendingUp,
      description: 'Cadastral heatmaps and risk signals',
    },
    {
      name: 'Priority Alerts',
      href: '/officer/alerts',
      icon: AlertTriangle,
      description: 'High-risk automated dispute signals',
    },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200
          transform transition-transform duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="p-6 border-b border-indigo-900/20 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white relative overflow-hidden">
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">BHOOMI SHIELD</h1>
                <p className="text-indigo-200 text-xs mt-0.5">Officer Command Portal</p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-slate-800">{user?.full_name || user?.username}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Revenue & Field Officer
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {navigation.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`
                    flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                    group relative overflow-hidden
                    ${active
                      ? 'bg-indigo-50 text-indigo-900 font-medium border border-indigo-200 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                  title={item.description}
                >
                  <span
                    className={`
                      flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
                      ${active
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 group-hover:text-indigo-600'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm truncate">{item.name}</p>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 text-indigo-600 self-center" />}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer / Logout */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-indigo-600 uppercase tracking-wider">Officer Console</span>
                <span>•</span>
                <span>Revenue, Field Surveys & Adjudication</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/parcels"
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>All Parcels</span>
              </Link>
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OfficerLayout;
