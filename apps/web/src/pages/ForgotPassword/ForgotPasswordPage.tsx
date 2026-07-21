import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import authService from '../../services/auth.service';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword({ email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsLoading(true);

    try {
      await authService.forgotPassword({ email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 mb-4 shadow-lg shadow-cyan-400/50">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            CyberiumShield AI
          </h1>
          <p className="text-slate-400 text-sm">Password Recovery</p>
        </div>

        <div className="bg-[#0F1729]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {!success ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Forgot Password?</h2>
                <p className="text-slate-400 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-lg bg-red-400/10 border border-red-400/30 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-400/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Check Your Email</h2>
              <p className="text-slate-400 text-sm mb-6">
                We've sent a password reset link to <span className="text-cyan-400 font-medium">{email}</span>
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Resend Email'}
              </button>
            </motion.div>
          )}

          <div className="mt-6">
            <Link
              to="/auth/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Reset link expires in 60 minutes
          </p>
        </div>
      </motion.div>
    </div>
  );
}
