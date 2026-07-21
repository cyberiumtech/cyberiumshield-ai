import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-red-400/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-orange-400/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-red-400/20 to-orange-400/20 border border-red-400/30 mb-8">
          <ShieldAlert className="w-12 h-12 text-red-400" />
        </div>

        <h1 className="text-6xl font-bold text-slate-100 mb-4">403</h1>
        <h2 className="text-3xl font-bold text-slate-200 mb-4">Access Denied</h2>
        <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
          You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            to="/"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
