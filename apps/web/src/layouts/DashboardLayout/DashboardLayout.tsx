import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar/Sidebar';

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200">
      <Navbar />
      <div className="flex w-full">
        <aside className="w-72 hidden lg:block shrink-0">
          <Sidebar activePath={location.pathname} />
        </aside>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

