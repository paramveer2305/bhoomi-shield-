import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleGuard, PublicRoute, RoleBasedLayout } from './components/RoleGuard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Role-specific page imports (lazy loaded)
const DashboardHome = React.lazy(() => import('./pages/DashboardHome'));
const CitizenPortfolio = React.lazy(() => import('./pages/citizen/PortfolioPage'));
const CitizenSearch = React.lazy(() => import('./pages/citizen/SearchPage'));
const CitizenDocuments = React.lazy(() => import('./pages/citizen/DocumentsPage'));
const CitizenAlerts = React.lazy(() => import('./pages/citizen/AlertsPage'));

const PatwariInspections = React.lazy(() => import('./pages/patwari/InspectionsPage'));
const PatwariSurveys = React.lazy(() => import('./pages/patwari/SurveysPage'));
const PatwariEvidence = React.lazy(() => import('./pages/patwari/EvidencePage'));
const PatwariVerification = React.lazy(() => import('./pages/patwari/VerificationPage'));
const PatwariAssignments = React.lazy(() => import('./pages/patwari/AssignmentsPage'));
const PatwariAlerts = React.lazy(() => import('./pages/patwari/AlertsPage'));

const TehsildarCases = React.lazy(() => import('./pages/tehsildar/CasesPage'));
const TehsildarResolution = React.lazy(() => import('./pages/tehsildar/ResolutionPage'));
const TehsildarMutations = React.lazy(() => import('./pages/tehsildar/MutationsPage'));
const TehsildarHistory = React.lazy(() => import('./pages/tehsildar/HistoryPage'));
const TehsildarAnalytics = React.lazy(() => import('./pages/tehsildar/AnalyticsPage'));
const TehsildarAlerts = React.lazy(() => import('./pages/tehsildar/AlertsPage'));

const AdminOverview = React.lazy(() => import('./pages/admin/OverviewPage'));
const AdminAIConfig = React.lazy(() => import('./pages/admin/RiskConfigurator'));
const AdminUsers = React.lazy(() => import('./pages/admin/UsersPage'));
const AdminLogs = React.lazy(() => import('./pages/admin/LogsPage'));
const AdminDatabase = React.lazy(() => import('./pages/admin/DatabasePage'));
const AdminSecurity = React.lazy(() => import('./pages/admin/SecurityPage'));
const AdminIntegrations = React.lazy(() => import('./pages/admin/IntegrationsPage'));
const AdminSettings = React.lazy(() => import('./pages/admin/SettingsPage'));
const AdminPersonnel = React.lazy(() => import('./pages/admin/PersonnelManager'));

// Legacy pages (for backward compatibility)
import ParcelListPage from './pages/parcels/ParcelListPage';
import ParcelDetailPage from './pages/parcels/ParcelDetailPage';
import LegacyCasesPage from './pages/cases/CasesPage';
import LegacyAlertsPage from './pages/alerts/AlertsPage';


class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-600 text-sm mb-6">
              {this.state.error?.message || "An unexpected error occurred while loading the portal."}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-md"
            >
              Reset Session & Go to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-secondary-600 font-medium">Loading portal...</p>
                </div>
              </div>
            }>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  }
                />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Protected Role-Based Routes */}
                <Route
                  element={
                    <RoleGuard>
                      <RoleBasedLayout />
                    </RoleGuard>
                  }
                >
                  {/* Citizen Routes */}
                  <Route path="/citizen" element={<Navigate to="/citizen/portfolio" replace />} />
                  <Route path="/citizen/portfolio" element={<CitizenPortfolio />} />
                  <Route path="/citizen/search" element={<CitizenSearch />} />
                  <Route path="/citizen/documents" element={<CitizenDocuments />} />
                  <Route path="/citizen/alerts" element={<CitizenAlerts />} />

                  {/* Patwari Routes */}
                  <Route path="/patwari" element={<Navigate to="/patwari/dashboard" replace />} />
                  <Route path="/patwari/dashboard" element={<DashboardHome />} />
                  <Route path="/patwari/inspections" element={<PatwariInspections />} />
                  <Route path="/patwari/surveys" element={<PatwariSurveys />} />
                  <Route path="/patwari/evidence" element={<PatwariEvidence />} />
                  <Route path="/patwari/verification" element={<PatwariVerification />} />
                  <Route path="/patwari/assignments" element={<PatwariAssignments />} />
                  <Route path="/patwari/alerts" element={<PatwariAlerts />} />

                  {/* Tehsildar Routes */}
                  <Route path="/tehsildar" element={<Navigate to="/tehsildar/dashboard" replace />} />
                  <Route path="/tehsildar/dashboard" element={<DashboardHome />} />
                  <Route path="/tehsildar/cases" element={<TehsildarCases />} />
                  <Route path="/tehsildar/resolution" element={<TehsildarResolution />} />
                  <Route path="/tehsildar/mutations" element={<TehsildarMutations />} />
                  <Route path="/tehsildar/history" element={<TehsildarHistory />} />
                  <Route path="/tehsildar/analytics" element={<TehsildarAnalytics />} />
                  <Route path="/tehsildar/alerts" element={<TehsildarAlerts />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin/overview" element={<AdminOverview />} />
                  <Route path="/admin/ai-config" element={<AdminAIConfig />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/logs" element={<AdminLogs />} />
                  <Route path="/admin/database" element={<AdminDatabase />} />
                  <Route path="/admin/security" element={<AdminSecurity />} />
                  <Route path="/admin/integrations" element={<AdminIntegrations />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/personnel" element={<AdminPersonnel />} />

                  {/* Shared Cadastral, Case, and Alert Routes inside Layout */}
                  <Route path="/parcels" element={<ParcelListPage />} />
                  <Route path="/parcels/:parcel_id" element={<ParcelDetailPage />} />
                  <Route path="/cases" element={<LegacyCasesPage />} />
                  <Route path="/alerts" element={<LegacyAlertsPage />} />
                </Route>

                {/* Root redirect based on role */}
                <Route
                  path="/"
                  element={
                    <RoleGuard>
                      <RoleBasedLayout />
                    </RoleGuard>
                  }
                />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;