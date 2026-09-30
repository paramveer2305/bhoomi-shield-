import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  FileCheck,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { stats } from '../../api/stats';
import { cases } from '../../api/cases';
import { parcels } from '../../api/parcels';
import type { DashboardStats } from '../../api/stats';
import type { Case, Parcel } from '../../types';

const OfficerDashboardPage: React.FC = () => {
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
        cases.getCases({ limit: 15 }).catch((err) => {
          console.error('Cases fetch error:', err);
          return [] as Case[];
        }),
        parcels.getParcels({ limit: 20 }).catch((err) => {
          console.error('Parcels fetch error:', err);
          return [] as Parcel[];
        }),
      ]);

      setDashboardStats(statsData);
      setCasesList(casesData);
      setParcelsList(parcelsData);
    } catch (err: any) {
      console.error('Failed to load officer dashboard data:', err);
      setError(err?.message || 'Failed to load officer dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const activeCases = casesList.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS');
  const disputedParcels = parcelsList.filter((p) => p.status === 'DISPUTED');
  const pendingVerifications = dashboardStats.verifications || parcelsList.filter((p) => p.status === 'REQUIRES_VERIFICATION').length;

  const statsCards = [
    {
      name: 'Active Dispute Cases',
      value: isLoading ? '...' : activeCases.length.toString(),
      icon: Gavel,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      tag: 'Urgent Hearing',
      onClick: () => navigate('/officer/cases'),
    },
    {
      name: 'Disputed Parcels',
      value: isLoading ? '...' : disputedParcels.length.toString(),
      icon: AlertTriangle,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      tag: 'Boundary Claims',
      onClick: () => navigate('/parcels'),
    },
    {
      name: 'Pending Verifications',
      value: isLoading ? '...' : pendingVerifications.toString(),
      icon: ClipboardCheck,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      tag: 'Field Surveys',
      onClick: () => navigate('/officer/verification'),
    },
    {
      name: 'Priority Risk Alerts',
      value: isLoading ? '...' : dashboardStats.active_alerts.toString(),
      icon: Shield,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      tag: 'Signals Flagged',
      onClick: () => navigate('/officer/alerts'),
    },
    {
      name: 'Total Parcels Under Jurisdiction',
      value: isLoading ? '...' : dashboardStats.total_parcels.toLocaleString(),
      icon: MapPin,
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-700',
      tag: 'Cadastral Records',
      onClick: () => navigate('/parcels'),
    },
  ];

  const quickActions = [
    {
      title: 'Dispute Resolution Bench',
      description: 'Conduct proceedings and issue formal land dispute rulings',
      icon: Scale,
      color: 'bg-indigo-600 text-white hover:bg-indigo-700',
      onClick: () => navigate('/officer/resolution'),
    },
    {
      title: 'Field Inspections',
      description: 'Schedule, execute, and verify on-ground cadastral surveys',
      icon: ClipboardCheck,
      color: 'bg-emerald-600 text-white hover:bg-emerald-700',
      onClick: () => navigate('/officer/inspections'),
    },
    {
      title: 'Mutation Orders',
      description: 'Review title transfer and mutation applications',
      icon: FileCheck,
      color: 'bg-blue-600 text-white hover:bg-blue-700',
      onClick: () => navigate('/officer/mutations'),
    },
    {
      title: 'Boundary Verification',
      description: 'Compare physical boundaries with satellite & GIS data',
      icon: Shield,
      color: 'bg-violet-600 text-white hover:bg-violet-700',
      onClick: () => navigate('/officer/verification'),
    },
    {
      title: 'Survey Evidence & Photos',
      description: 'Upload field inspection photographs and GPS landmarks',
      icon: Camera,
      color: 'bg-amber-600 text-white hover:bg-amber-700',
      onClick: () => navigate('/officer/evidence'),
    },
    {
      title: 'Cadastral Risk Analytics',
      description: 'Review district-wide fraud signals and spatial heatmaps',
      icon: TrendingUp,
      color: 'bg-slate-800 text-white hover:bg-slate-900',
      onClick: () => navigate('/officer/analytics'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Unified Officer Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome, {user?.full_name || user?.username || 'Officer'}
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
              Execute judicial dispute adjudications, field inspections, mutation approvals, and AI-driven land risk monitoring from a single console.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              onClick={stat.onClick}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.name}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">{stat.tag}</span>
                <span className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Matrix */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Officer Operations & Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.title}
                onClick={action.onClick}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-start gap-4"
              >
                <div className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Active Cases & Priority Parcels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Cases Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Active Dispute Cases</h3>
              </div>
              <button
                onClick={() => navigate('/officer/cases')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                All Cases <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {casesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No dispute cases currently registered.
                </div>
              ) : (
                casesList.slice(0, 5).map((c) => (
                  <div
                    key={c.case_id}
                    onClick={() => navigate('/officer/cases')}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-700">{c.case_id}</span>
                        <span className="text-xs font-medium text-slate-800 truncate">{c.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Parcel: {c.parcel_id} • Status: <span className="font-semibold text-slate-700">{c.status}</span>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {c.case_type || 'DISPUTE'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => navigate('/officer/resolution')}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Open Adjudication Chamber</span>
            </button>
          </div>
        </div>

        {/* High Risk Parcels Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900">High Risk & Flagged Parcels</h3>
              </div>
              <button
                onClick={() => navigate('/parcels')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                All Parcels <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {parcelsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No land parcels registered yet.
                </div>
              ) : (
                parcelsList.slice(0, 5).map((p) => (
                  <div
                    key={p.parcel_id}
                    onClick={() => navigate(`/parcels/${p.parcel_id}`)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">{p.parcel_id}</span>
                        <span className="text-xs text-slate-600 truncate">({p.village}, {p.tehsil})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Owner: {p.owner_name} • Survey: {p.survey_number}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        p.status === 'DISPUTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : p.status === 'REQUIRES_VERIFICATION'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => navigate('/officer/verification')}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Verify Land Records & Boundaries</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboardPage;
