import React from 'react';

export function TopNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0B1120]/70 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/30">
            <span className="text-cyan-300 font-semibold">CS</span>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">CyberiumShield AI</div>
            <div className="text-xs text-slate-400">Enterprise Cybersecurity Platform</div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 mx-6">
          <div className="w-full max-w-xl">
            <input
              aria-label="Global Search"
              placeholder="Global Search (mock)"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs text-slate-400">AI: Ready</div>
          <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}

