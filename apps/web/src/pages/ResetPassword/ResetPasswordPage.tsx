import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import authService from '../../services/auth.service';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!allRequirementsMet) {
      setError('Password does not meet security requirements');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword({
        email,
        password,
        password_confirmation: confirmPassword,
        token,
      });
      setSuccess(true);
      setTimeout(() => navigate('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Invalid Reset Link</h2>
          <p className="text-slate-400 mb-6">This password reset link is invalid or has expired.</p>
          <Link
            to="/auth/forgot-password"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

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
          <p className="text-slate-400 text-sm">Reset Your Password</p>
        </div>

        <div className="bg-[#0F1729]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {!success ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Create New Password</h2>
                <p className="text-slate-400 text-sm">
                  Enter a strong password for your account.
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
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {password && (
                    <div className="mt-3 space-y-1">
                      {passwordRequirements.map((req, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-xs ${
                            req.met ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          <Check className={`w-3 h-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                          {req.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !allRequirementsMet}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
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
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Password Reset Successful</h2>
              <p className="text-slate-400 text-sm mb-6">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <p className="text-slate-500 text-xs mb-4">Redirecting to login...</p>
              <Link
                to="/auth/login"
                className="inline-block w-full py-3 px-4 bg-gradient-to-r from-cyan-400 to-blue-400 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Sign In Now
              </Link>
            </motion.div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Protected by enterprise-grade encryption
          </p>
        </div>
      </motion.div>
    </div>
  );
}
