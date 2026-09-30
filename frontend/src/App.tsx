import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleGuard, PublicRoute, RoleBasedLayout } from './components/RoleGuard';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Role-specific page imports (lazy loaded)
const OfficerDashboard = React.lazy(() => import('./pages/officer/OfficerDashboardPage'));
const CitizenPortfolio = React.lazy(() => import('./pages/citizen/PortfolioPage'));
const CitizenSearch = React.lazy(() => import('./pages/citizen/SearchPage'));
const CitizenDocuments = React.lazy(() => import('./pages/citizen/DocumentsPage'));
const CitizenAlerts = React.lazy(() => import('./pages/citizen/AlertsPage'));

// Unified Officer Capabilities (merged from field inspections and executive dispute adjudication)
const OfficerInspections = React.lazy(() => import('./pages/patwari/InspectionsPage'));
const OfficerSurveys = React.lazy(() => import('./pages/patwari/SurveysPage'));
const OfficerEvidence = React.lazy(() => import('./pages/patwari/EvidencePage'));
const OfficerVerification = React.lazy(() => import('./pages/patwari/VerificationPage'));
const OfficerAssignments = React.lazy(() => import('./pages/patwari/AssignmentsPage'));

const OfficerCases = React.lazy(() => import('./pages/tehsildar/CasesPage'));
const OfficerResolution = React.lazy(() => import('./pages/tehsildar/ResolutionPage'));
const OfficerMutations = React.lazy(() => import('./pages/tehsildar/MutationsPage'));
const OfficerHistory = React.lazy(() => import('./pages/tehsildar/HistoryPage'));
const OfficerAnalytics = React.lazy(() => import('./pages/tehsildar/AnalyticsPage'));
const OfficerAlerts = React.lazy(() => import('./pages/tehsildar/AlertsPage'));

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

                  {/* Unified Officer Routes (Revenue & Field Enforcement) */}
                  <Route path="/officer" element={<Navigate to="/officer/dashboard" replace />} />
                  <Route path="/officer/dashboard" element={<OfficerDashboard />} />
                  <Route path="/officer/cases" element={<OfficerCases />} />
                  <Route path="/officer/resolution" element={<OfficerResolution />} />
                  <Route path="/officer/mutations" element={<OfficerMutations />} />
                  <Route path="/officer/inspections" element={<OfficerInspections />} />
                  <Route path="/officer/surveys" element={<OfficerSurveys />} />
                  <Route path="/officer/evidence" element={<OfficerEvidence />} />
                  <Route path="/officer/verification" element={<OfficerVerification />} />
                  <Route path="/officer/assignments" element={<OfficerAssignments />} />
                  <Route path="/officer/analytics" element={<OfficerAnalytics />} />
                  <Route path="/officer/history" element={<OfficerHistory />} />
                  <Route path="/officer/alerts" element={<OfficerAlerts />} />

                  {/* Legacy Route Redirects to Officer Dashboard */}
                  <Route path="/patwari/*" element={<Navigate to="/officer/dashboard" replace />} />
                  <Route path="/tehsildar/*" element={<Navigate to="/officer/dashboard" replace />} />
                  <Route path="/admin/*" element={<Navigate to="/officer/dashboard" replace />} />

                  {/* Shared Cadastral, Case, and Alert Routes inside Layout */}
                  <Route path="/parcels" element={<ParcelListPage />} />
                  <Route path="/parcels/:parcel_id" element={<ParcelDetailPage />} />
                  <Route path="/cases" element={<OfficerCases />} />
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