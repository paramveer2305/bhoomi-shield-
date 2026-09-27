import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout, Sidebar, Header } from '../../components/ui/Layout';

const navigation = [
  { name: 'Cases', href: '/tehsildar/cases', icon: 'FolderOpen' },
  { name: 'Resolution', href: '/tehsildar/resolution', icon: 'Gavel' },
  { name: 'Mutations', href: '/tehsildar/mutations', icon: 'ArrowRightLeft' },
  { name: 'History', href: '/tehsildar/history', icon: 'Clock' },
  { name: 'Analytics', href: '/tehsildar/analytics', icon: 'BarChart' },
  { name: 'Alerts', href: '/tehsildar/alerts', icon: 'Bell' },
];

const TehsildarLayout: React.FC = () => {
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

export default TehsildarLayout;