import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout, Sidebar, Header } from '../../components/ui/Layout';

const navigation = [
  { name: 'Portfolio', href: '/citizen/portfolio', icon: 'Home' },
  { name: 'Search', href: '/citizen/search', icon: 'Search' },
  { name: 'Documents', href: '/citizen/documents', icon: 'FileText' },
  { name: 'Alerts', href: '/citizen/alerts', icon: 'Bell' },
];

const CitizenLayout: React.FC = () => {
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

export default CitizenLayout;