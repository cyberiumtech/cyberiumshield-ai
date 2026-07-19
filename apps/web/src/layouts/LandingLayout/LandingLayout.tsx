import React from 'react';
import { Outlet } from 'react-router-dom';

export function LandingLayout() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200">
      <Outlet />
    </div>
  );
}

