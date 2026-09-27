import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart3, MapPin, AlertTriangle, TrendingUp, ArrowRight, Shield, FileText } from 'lucide-react';
import { stats } from '../api/stats';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState({
    total_parcels: 0,
    active_alerts: 0,
    risk_analyses: 0,
    verifications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await stats.getDashboardStats();
        setDashboardStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsCards = [
    {
      name: 'Total Parcels',
      value: isLoading ? '...' : dashboardStats.total_parcels.toLocaleString(),
      icon: MapPin,
      gradient: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-600',
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Active Alerts',
      value: isLoading ? '...' : dashboardStats.active_alerts.toString(),
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      change: '-5%',
      changeType: 'positive',
    },
    {
      name: 'Risk Analysis',
      value: isLoading ? '...' : dashboardStats.risk_analyses.toLocaleString(),
      icon: BarChart3,
      gradient: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      change: '+8%',
      changeType: 'neutral',
    },
    {
      name: 'Verifications',
      value: isLoading ? '...' : dashboardStats.verifications.toLocaleString(),
      icon: TrendingUp,
      gradient: 'from-accent-500 to-accent-600',
      bgColor: 'bg-accent-50',
      textColor: 'text-accent-600',
      change: '+15%',
      changeType: 'positive',
    },
  ];

  const quickActions = [
    {
      title: 'View Parcels',
      description: 'Browse all registered land parcels',
      icon: MapPin,
      color: 'primary',
      onClick: () => navigate('/parcels'),
    },
    {
      title: 'Check Alerts',
      description: 'Review active risk signals',
      icon: AlertTriangle,
      color: 'red',
      onClick: () => navigate('/alerts'),
    },
    ...(user?.role !== 'citizen' ? [{
      title: 'Manage Cases',
      description: 'Handle verification requests',
      icon: Shield,
      color: 'accent',
      onClick: () => navigate('/cases'),
    }] : []),
  ];

  const recentActivities = [
    { text: 'New parcel registered in District A', time: '2 hours ago', color: 'primary' },
    { text: 'Risk analysis completed for Survey #1234', time: '5 hours ago', color: 'amber' },
    { text: 'Verification completed successfully', time: '1 day ago', color: 'accent' },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
      <div className="card-elevated bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || 'User'}
            </h1>
            <p className="text-primary-100 text-lg">
              Bhoomi Shield - Land Dispute Early Warning & Cadastral Risk Intelligence System
            </p>
          </div>
          <div className="hidden md:block p-4 bg-white/10 backdrop-blur-sm rounded-xl">
            <Shield className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
            Role: {user?.role || 'citizen'}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-500/20 backdrop-blur-sm">
            Active Session
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="card hover:shadow-elevated transition-all duration-300 p-6 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <span
                  className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                    stat.changeType === 'positive'
                      ? 'text-accent-600 bg-accent-50'
                      : 'text-amber-600 bg-amber-50'
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
          <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const colorMap = {
              primary: 'from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
              red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
              accent: 'from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700',
            };
            return (
              <button
                key={action.title}
                onClick={action.onClick}
                className={`px-6 py-5 bg-gradient-to-br ${colorMap[action.color as keyof typeof colorMap]} text-white rounded-xl shadow-soft hover:shadow-elevated transition-all duration-300 text-left group`}
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivities.map((activity, index) => {
            const colorMap = {
              primary: 'bg-primary-500',
              amber: 'bg-amber-500',
              accent: 'bg-accent-500',
            };
            return (
              <div key={index} className="flex items-start pb-4 border-b border-gray-100 last:border-0 group hover:bg-gray-50/50 -mx-4 px-4 py-3 rounded-lg transition-colors duration-200">
                <div className={`flex-shrink-0 w-2 h-2 mt-2 ${colorMap[activity.color as keyof typeof colorMap]} rounded-full group-hover:scale-125 transition-transform duration-200`}></div>
                <div className="ml-4 flex-1">
                  <p className="text-sm text-gray-900 font-medium">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
