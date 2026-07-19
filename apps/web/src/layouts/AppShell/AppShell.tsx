import React from 'react';
import { Outlet } from 'react-router-dom';



/**
 * AppShell decides which high-level layout to use.
 * For now: routes under '/' render LandingLayout; other routes render DashboardLayout.
 */
export function AppShell() {
  // Keep it simple: if you navigate to root, use Landing layout.
  // Actual matching can be refined later.
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}

// Legacy router-based layout wrapper was referencing a missing component.
// Kept for backward compatibility but not used by App.tsx.
export function AppShellRouter() {
  return (
    <>
      <Outlet />
    </>
  );
}

