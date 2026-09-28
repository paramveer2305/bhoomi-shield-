import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  MapPin,
  AlertTriangle,
  ArrowRight,
  Shield,
  FileText,
  Gavel,
  Scale,
  ClipboardCheck,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Camera,
  Map as MapIcon,
  FileCheck,
} from 'lucide-react';
import { stats } from '../api/stats';
import { cases } from '../api/cases';
import { parcels } from '../api/parcels';
import type { DashboardStats } from '../api/stats';
import type { Case, Parcel } from '../types';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_parcels: 0,
    active_alerts: 0,
    risk_analyses: 0,
    verifications: 0,
  });
  const [casesList, setCasesList] = useState<Case[]>([]);
  const [parcelsList, setParcelsList] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, casesData, parcelsData] = await Promise.all([
        stats.getDashboardStats().catch((err) => {
          console.error('Stats fetch error:', err);
          return { total_parcels: 0, active_alerts: 0, risk_analyses: 0, verifications: 0 };
        }),
        cases.getCases({ limit: 50 }).catch((err) => {
          console.error('Cases fetch error:', err);
          return [] as Case[];
        }),
        parcels.getParcels({ limit: 50 }).catch((err) => {
          console.error('Parcels fetch error:', err);
          return [] as Parcel[];
        }),
      ]);

      setDashboardStats(statsData);
      setCasesList(casesData);
      setParcelsList(parcelsData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.message || 'Failed to load officer dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived real metrics from actual backend responses
  const activeCasesCount = casesList.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
  const disputedParcelsCount = parcelsList.filter((p) => p.status === 'DISPUTED').length;
  const requiresVerificationCount = parcelsList.filter((p) => p.status === 'REQUIRES_VERIFICATION').length;

  const isPatwari = user?.role === 'patwari';
  const isTehsildar = user?.role === 'tehsildar';

  // Role-specific stats metrics
  const statsCards = isTehsildar
    ? [
        {
          name: 'Active Dispute Cases',
          value: isLoading ? '...' : activeCasesCount.toString(),
          icon: Gavel,
          bgColor: 'bg-red-50',
          textColor: 'text-red-600',
          change: 'Active',
          changeType: 'negative',
          onClick: () => navigate('/tehsildar/cases'),
        },
        {
          name: 'Disputed Land Parcels',
          value: isLoading ? '...' : disputedParcelsCount.toString(),
          icon: AlertTriangle,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-600',
          change: 'High Risk',
          changeType: 'negative',
          onClick: () => navigate('/parcels'),
        },
        {
          name: 'Priority Alerts',
          value: isLoading ? '...' : dashboardStats.active_alerts.toString(),
          icon: Shield,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          change: 'Requires Review',
          changeType: 'neutral',
          onClick: () => navigate('/tehsildar/alerts'),
        },
        {
          name: 'Total Parcels',
          value: isLoading ? '...' : dashboardStats.total_parcels.toLocaleString(),
          icon: MapPin,
          bgColor: 'bg-primary-50',
          textColor: 'text-primary-600',
          change: 'Registered',
          changeType: 'positive',
          onClick: () => navigate('/parcels'),
        },
      ]
    : isPatwari
    ? [
        {
          name: 'Total Parcels',
          value: isLoading ? '...' : dashboardStats.total_parcels.toLocaleString(),
          icon: MapPin,
          bgColor: 'bg-primary-50',
          textColor: 'text-primary-600',
          change: 'Registered',
          changeType: 'positive',
          onClick: () => navigate('/parcels'),
        },
        {
          name: 'Active Field Alerts',
          value: isLoading ? '...' : dashboardStats.active_alerts.toString(),
          icon: AlertTriangle,
          bgColor: 'bg-red-50',
          textColor: 'text-red-600',
          change: 'Critical Signals',
          changeType: 'negative',
          onClick: () => navigate('/patwari/alerts'),
        },
        {
          name: 'Pending Verifications',
          value: isLoading ? '...' : (dashboardStats.verifications || requiresVerificationCount).toLocaleString(),
          icon: TrendingUp,
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-600',
          change: 'Field Tasks',
          changeType: 'positive',
          onClick: () => navigate('/patwari/verification'),
        },
        {
          name: 'Disputed Parcels',
          value: isLoading ? '...' : disputedParcelsCount.toString(),
          icon: Shield,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-600',
          change: 'Boundary Claims',
          changeType: 'neutral',
          onClick: () => navigate('/parcels'),
        },
      ]
    : [
        {
          name: 'Total Parcels',
          value: isLoading ? '...' : dashboardStats.total_parcels.toLocaleString(),
          icon: MapPin,
          bgColor: 'bg-primary-50',
          textColor: 'text-primary-600',
          change: 'Registered',
          changeType: 'positive',
          onClick: () => navigate('/parcels'),
        },
        {
          name: 'Active Alerts',
          value: isLoading ? '...' : dashboardStats.active_alerts.toString(),
          icon: AlertTriangle,
          bgColor: 'bg-red-50',
          textColor: 'text-red-600',
          change: 'Live Signals',
          changeType: 'negative',
          onClick: () => navigate('/alerts'),
        },
        {
          name: 'Risk Assessments',
          value: isLoading ? '...' : dashboardStats.risk_analyses.toLocaleString(),
          icon: BarChart3,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-600',
          change: 'Scored',
          changeType: 'neutral',
          onClick: () => navigate('/parcels'),
        },
        {
          name: 'Verifications',
          value: isLoading ? '...' : dashboardStats.verifications.toLocaleString(),
          icon: TrendingUp,
          bgColor: 'bg-accent-50',
          textColor: 'text-accent-600',
          change: 'Completed',
          changeType: 'positive',
          onClick: () => navigate('/parcels'),
        },
      ];

  // Role-specific quick actions
  const quickActions = isTehsildar
    ? [
        {
          title: 'Executive Case Panel',
          description: 'Review and adjudicate active dispute cases',
          icon: Gavel,
          color: 'red',
          onClick: () => navigate('/tehsildar/cases'),
        },
        {
          title: 'Dispute Resolution',
          description: 'Manage legal settlement proceedings and hearings',
          icon: Scale,
          color: 'primary',
          onClick: () => navigate('/tehsildar/resolution'),
        },
        {
          title: 'Priority Alerts',
          description: 'Inspect critical cadastral risk signals',
          icon: AlertTriangle,
          color: 'red',
          onClick: () => navigate('/tehsildar/alerts'),
        },
        {
          title: 'Cadastral Parcels',
          description: 'Browse district land records and boundaries',
          icon: MapPin,
          color: 'primary',
          onClick: () => navigate('/parcels'),
        },
        {
          title: 'Mutation Orders',
          description: 'Approve or reject land mutation applications',
          icon: FileCheck,
          color: 'accent',
          onClick: () => navigate('/tehsildar/mutations'),
        },
        {
          title: 'Risk Analytics',
          description: 'District risk trends, heatmaps, and forecasts',
          icon: TrendingUp,
          color: 'primary',
          onClick: () => navigate('/tehsildar/analytics'),
        },
      ]
    : isPatwari
    ? [
        {
          title: 'Field Inspections',
          description: 'Conduct and record field survey inspections',
          icon: ClipboardCheck,
          color: 'primary',
          onClick: () => navigate('/patwari/inspections'),
        },
        {
          title: 'Parcel Verification',
          description: 'Verify parcel boundaries and land titles',
          icon: Shield,
          color: 'accent',
          onClick: () => navigate('/patwari/verification'),
        },
        {
          title: 'Field Alerts',
          description: 'Review active boundary and risk alerts',
          icon: AlertTriangle,
          color: 'red',
          onClick: () => navigate('/patwari/alerts'),
        },
        {
          title: 'Browse Parcels',
          description: 'Inspect cadastral parcel registry and map',
          icon: MapPin,
          color: 'primary',
          onClick: () => navigate('/parcels'),
        },
        {
          title: 'Pending Surveys',
          description: 'Manage assigned ground surveys',
          icon: MapIcon,
          color: 'accent',
          onClick: () => navigate('/patwari/surveys'),
        },
        {
          title: 'Evidence Vault',
          description: 'Upload site photographs and measurements',
          icon: Camera,
          color: 'primary',
          onClick: () => navigate('/patwari/evidence'),
        },
      ]
    : [
        {
          title: 'View Parcels',
          description: 'Browse all registered land parcels',
          icon: MapPin,
          color: 'primary',
          onClick: () => navigate('/parcels'),
        },
        {
          title: 'Check Alerts',
          description: 'Review active risk signals and notifications',
          icon: AlertTriangle,
          color: 'red',
          onClick: () => navigate('/alerts'),
        },
        {
          title: 'Manage Cases',
          description: 'Handle verification requests and disputes',
          icon: Shield,
          color: 'accent',
          onClick: () => navigate('/cases'),
        },
      ];

  // Derive real recent activities from real cases and parcels
  const realActivities = [
    ...casesList.slice(0, 3).map((c) => ({
      text: `Case ${c.case_id}: ${c.title} (${c.status.replace('_', ' ')})`,
      time: new Date(c.created_at).toLocaleDateString(),
      color: c.status === 'OPEN' ? 'red' : 'accent',
      onClick: () => navigate(`/parcels/${c.parcel_id}?tab=cases`),
    })),
    ...parcelsList.slice(0, 3).map((p) => ({
      text: `Parcel ${p.survey_number} in ${p.village}, ${p.district} (${p.status.replace('_', ' ')})`,
      time: new Date(p.created_at).toLocaleDateString(),
      color: 'primary',
      onClick: () => navigate(`/parcels/${p.parcel_id}`),
    })),
  ].slice(0, 5);

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
      <div className="card-elevated bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white p-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || 'Officer'}
            </h1>
            <p className="text-primary-100 text-lg">
              Bhoomi Shield - Land Dispute Early Warning & Cadastral Risk Intelligence System
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="hidden md:block p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
            Role: {user?.role ? user.role.toUpperCase() : 'OFFICER'}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-200">
            Live Database Connected
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="text-xs font-semibold underline hover:no-underline ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              onClick={stat.onClick}
              className="card hover:shadow-elevated transition-all duration-300 p-6 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    stat.changeType === 'positive'
                      ? 'text-emerald-700 bg-emerald-50'
                      : stat.changeType === 'negative'
                      ? 'text-red-700 bg-red-50'
                      : 'text-amber-700 bg-amber-50'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600 font-medium">{stat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isTehsildar ? 'Executive Judicial Actions' : isPatwari ? 'Field Operations Actions' : 'Quick Actions'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Direct access to role-authorized functions and workflows
            </p>
          </div>
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const colorMap = {
              primary: 'from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800',
              red: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
              accent: 'from-accent-600 to-accent-700 hover:from-accent-700 hover:to-accent-800',
            };
            return (
              <button
                key={action.title}
                onClick={action.onClick}
                className={`px-6 py-5 bg-gradient-to-br ${colorMap[action.color as keyof typeof colorMap]} text-white rounded-xl shadow-soft hover:shadow-elevated transition-all duration-300 text-left group cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                  <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="font-bold text-lg mb-1">{action.title}</h3>
                <p className="text-sm text-white/90">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent System Activity</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            Realtime Cadastral Stream
          </span>
        </div>
        {realActivities.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No recent records available.</p>
        ) : (
          <div className="space-y-4">
            {realActivities.map((activity, index) => {
              const colorMap = {
                primary: 'bg-primary-500',
                amber: 'bg-amber-500',
                accent: 'bg-accent-500',
                red: 'bg-red-500',
              };
              return (
                <div
                  key={index}
                  onClick={activity.onClick}
                  className="flex items-start pb-4 border-b border-gray-100 last:border-0 group hover:bg-gray-50/50 -mx-4 px-4 py-3 rounded-lg transition-colors duration-200 cursor-pointer"
                >
                  <div
                    className={`flex-shrink-0 w-2.5 h-2.5 mt-2 ${colorMap[activity.color as keyof typeof colorMap]} rounded-full group-hover:scale-125 transition-transform duration-200`}
                  />
                  <div className="ml-4 flex-1">
                    <p className="text-sm text-gray-900 font-medium group-hover:text-primary-600 transition-colors">
                      {activity.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all self-center" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
