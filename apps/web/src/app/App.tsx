import { Routes, Route, Navigate } from 'react-router-dom';

// Components
import { ProtectedRoute } from '../components/ProtectedRoute/ProtectedRoute';
import { GuestRoute } from '../components/GuestRoute/GuestRoute';

// Layouts
import { DashboardLayout } from '../layouts/DashboardLayout/DashboardLayout';
import { LandingLayout } from '../layouts/LandingLayout/LandingLayout';

// Pages
import { LandingPage } from '../pages/Landing/LandingPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPassword/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPassword/ResetPasswordPage';
import { VerifyEmailPage } from '../pages/VerifyEmail/VerifyEmailPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { SecurityCenterPage } from '../pages/SecurityCenter/SecurityCenterPage';
import { ThreatDetectionPage } from '../pages/ThreatDetection/ThreatDetectionPage';
import { VulnerabilityPage } from '../pages/Vulnerability/VulnerabilityPage';
import { ThreatIntelligencePage } from '../pages/ThreatIntelligence/ThreatIntelligencePage';
import { MalwarePage } from '../pages/Malware/MalwarePage';
import { PhishingPage } from '../pages/Phishing/PhishingPage';
import { LogsPage } from '../pages/Logs/LogsPage';
import { ReportsPage } from '../pages/Reports/ReportsPage';
import { AIAssistantPage } from '../pages/AIAssistant/AIAssistantPage';
import { AdminPage } from '../pages/Admin/AdminPage';
import { UnauthorizedPage } from '../pages/Unauthorized/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage';

/**
 * A placeholder component for pages that are not yet implemented.
 * @param {object} props - The component props.
 * @param {string} props.pageName - The name of the page to display.
 */
function PlaceholderRoute({ pageName }: { pageName: string }) {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-slate-100 mb-4">{pageName}</h1>
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-8 text-center">
        <p className="text-slate-400">This page is a placeholder. The full implementation is pending.</p>
        <p className="text-sm text-slate-500 mt-2">Refer to `TODO.md` for the implementation plan.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<LandingLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      {/* Guest routes - redirect to dashboard if authenticated */}
      <Route element={<GuestRoute><LandingLayout /></GuestRoute>}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Email verification - semi-protected (requires token) */}
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

      {/* Protected routes - require authentication */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/security-center" element={<SecurityCenterPage />} />
        <Route path="/threat-detection" element={<ThreatDetectionPage />} />
        <Route path="/network" element={<PlaceholderRoute pageName="Network Monitoring" />} />
        <Route path="/vulnerability" element={<VulnerabilityPage />} />
        <Route path="/threat-intelligence" element={<ThreatIntelligencePage />} />
        <Route path="/malware" element={<MalwarePage />} />
        <Route path="/phishing" element={<PhishingPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/incidents" element={<PlaceholderRoute pageName="Incidents" />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/analytics" element={<PlaceholderRoute pageName="Analytics" />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/users" element={<AdminPage />} />
        <Route path="/roles" element={<AdminPage />} />
        <Route path="/profile" element={<PlaceholderRoute pageName="User Profile" />} />
        <Route path="/settings" element={<PlaceholderRoute pageName="Settings" />} />
      </Route>

      {/* Error routes */}
      <Route path="/403" element={<UnauthorizedPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Redirects */}
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/register" element={<Navigate to="/auth/register" replace />} />

      {/* 404 */}
      <Route element={<LandingLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
