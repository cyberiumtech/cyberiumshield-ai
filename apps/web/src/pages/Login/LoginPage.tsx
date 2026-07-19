import React from 'react';

export function LoginPage() {
  return (
    <div className="mx-auto max-w-md p-6 md:p-8">
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="mt-1 text-sm text-slate-400">Mock login page (JWT/Sanctum later).</p>

        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl border border-white/10 bg-[#0B1120]/30 px-4 py-2 text-sm outline-none"
            placeholder="Email"
          />
          <input
            type="password"
            className="w-full rounded-xl border border-white/10 bg-[#0B1120]/30 px-4 py-2 text-sm outline-none"
            placeholder="Password"
          />
          <button className="w-full rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-400/30 hover:bg-cyan-500/25">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

