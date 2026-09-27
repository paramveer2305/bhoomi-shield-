import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout, Sidebar, Header } from '../../components/ui/Layout';

const navigation = [
  { name: 'Inspections', href: '/patwari/inspections', icon: 'ClipboardCheck' },
  { name: 'Surveys', href: '/patwari/surveys', icon: 'MapPin' },
  { name: 'Evidence', href: '/patwari/evidence', icon: 'FileText' },
  { name: 'Verification', href: '/patwari/verification', icon: 'CheckCircle' },
  { name: 'Assignments', href: '/patwari/assignments', icon: 'List' },
  { name: 'Alerts', href: '/patwari/alerts', icon: 'Bell' },
];

const PatwariLayout: React.FC = () => {
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

export default PatwariLayout;