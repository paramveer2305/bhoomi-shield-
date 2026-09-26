import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardHome from './pages/DashboardHome';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ParcelListPage from './pages/parcels/ParcelListPage';
import ParcelDetailPage from './pages/parcels/ParcelDetailPage';
import CasesPage from './pages/cases/CasesPage';
import AlertsPage from './pages/alerts/AlertsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="parcels" element={<ParcelListPage />} />
            <Route path="parcels/:parcel_id" element={<ParcelDetailPage />} />
            <Route
              path="cases"
              element={
                <ProtectedRoute allowedRoles={['officer', 'admin']}>
                  <CasesPage />
                </ProtectedRoute>
              }
            />
            <Route path="alerts" element={<AlertsPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
