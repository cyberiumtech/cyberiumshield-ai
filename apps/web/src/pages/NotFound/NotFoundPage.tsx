import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg p-6 md:p-10">
      <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center">
        <div className="text-5xl font-semibold text-cyan-300">404</div>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">This route does not exist in the mock app.</p>
        <div className="mt-5">
          <Link to="/" className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

