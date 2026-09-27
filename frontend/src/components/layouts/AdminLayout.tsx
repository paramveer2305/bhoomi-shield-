import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout, Sidebar, Header } from '../../components/ui/Layout';

const navigation = [
  { name: 'Overview', href: '/admin/overview', icon: 'LayoutDashboard' },
  { name: 'AI Config', href: '/admin/ai-config', icon: 'Brain' },
  { name: 'Users', href: '/admin/users', icon: 'Users' },
  { name: 'Logs', href: '/admin/logs', icon: 'FileText' },
  { name: 'Database', href: '/admin/database', icon: 'Database' },
  { name: 'Security', href: '/admin/security', icon: 'Shield' },
  { name: 'Integrations', href: '/admin/integrations', icon: 'Plug' },
  { name: 'Settings', href: '/admin/settings', icon: 'Settings' },
  { name: 'Personnel', href: '/admin/personnel', icon: 'UserCog' },
];

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout>
      <Sidebar
        user={user}
        navigation={navigation}
        onLogout={handleLogout}
      />
      <Header user={user} onLogout={handleLogout} />
      <main className="flex-1 p-6 lg:ml-64">
        <Outlet />
      </main>
    </Layout>
  );
};

export default AdminLayout;