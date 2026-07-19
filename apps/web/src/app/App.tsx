import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell/AppShell';

// Pages that already exist
import { LandingPage } from '../pages/Landing/LandingPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage';

// For now, route all other paths to a placeholder to avoid missing-module errors.
function PlaceholderRoute() {
  return (
    <div className="p-6 text-slate-300">
      Placeholder route. Implement the full page modules next.
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="/dashboard" element={<PlaceholderRoute />} />
        <Route path="/security-center" element={<PlaceholderRoute />} />
        <Route path="/threat-detection" element={<PlaceholderRoute />} />
        <Route path="/network" element={<PlaceholderRoute />} />
        <Route path="/vulnerability" element={<PlaceholderRoute />} />
        <Route path="/threat-intelligence" element={<PlaceholderRoute />} />
        <Route path="/malware" element={<PlaceholderRoute />} />
        <Route path="/phishing" element={<PlaceholderRoute />} />
        <Route path="/logs" element={<PlaceholderRoute />} />
        <Route path="/incidents" element={<PlaceholderRoute />} />
        <Route path="/reports" element={<PlaceholderRoute />} />
        <Route path="/analytics" element={<PlaceholderRoute />} />
        <Route path="/ai-assistant" element={<PlaceholderRoute />} />
        <Route path="/users" element={<PlaceholderRoute />} />
        <Route path="/roles" element={<PlaceholderRoute />} />
        <Route path="/profile" element={<PlaceholderRoute />} />
        <Route path="/settings" element={<PlaceholderRoute />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}


