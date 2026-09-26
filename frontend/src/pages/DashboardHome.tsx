import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, MapPin, AlertTriangle, TrendingUp } from 'lucide-react';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Total Parcels',
      value: '1,234',
      icon: MapPin,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      name: 'Active Alerts',
      value: '23',
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: '-5%',
    },
    {
      name: 'Risk Analysis',
      value: '456',
      icon: BarChart3,
      color: 'bg-yellow-500',
      change: '+8%',
    },
    {
      name: 'Verifications',
      value: '789',
      icon: TrendingUp,
      color: 'bg-green-500',
      change: '+15%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.full_name}
        </h1>
        <p className="text-gray-600">
          Here's an overview of your land parcels and risk monitoring system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button className="px-6 py-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left">
            <h3 className="font-semibold mb-1">View Parcels</h3>
            <p className="text-sm text-blue-600">Browse all registered land parcels</p>
          </button>
          <button className="px-6 py-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-left">
            <h3 className="font-semibold mb-1">Check Alerts</h3>
            <p className="text-sm text-red-600">Review active risk signals</p>
          </button>
          {user?.role !== 'citizen' && (
            <button className="px-6 py-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left">
              <h3 className="font-semibold mb-1">Manage Cases</h3>
              <p className="text-sm text-green-600">Handle verification requests</p>
            </button>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start pb-4 border-b border-gray-100">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-900">New parcel registered in District A</p>
              <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start pb-4 border-b border-gray-100">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-yellow-500 rounded-full"></div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-900">Risk analysis completed for Survey #1234</p>
              <p className="text-xs text-gray-500 mt-1">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-900">Verification completed successfully</p>
              <p className="text-xs text-gray-500 mt-1">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
