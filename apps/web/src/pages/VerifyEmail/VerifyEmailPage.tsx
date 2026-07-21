import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import authService from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = searchParams.get('id');
  const hash = searchParams.get('hash');

  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (id && hash) {
      verifyEmail();
    }
  }, [id, hash]);

  const verifyEmail = async () => {
    if (!id || !hash) return;

    setStatus('verifying');
    try {
      await authService.verifyEmail(id, hash);
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      await authService.resendVerification();
      setStatus('pending');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
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
          <p className="text-slate-400 text-sm">Email Verification</p>
        </div>

        <div className="bg-[#0F1729]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {status === 'verifying' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-400/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Verifying Email</h2>
              <p className="text-slate-400 text-sm">
                Please wait while we verify your email address...
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-400/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Email Verified!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Your email has been verified successfully. You can now access all features.
              </p>
              <p className="text-slate-500 text-xs">Redirecting to dashboard...</p>
            </motion.div>
          )}

          {status === 'pending' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Verify Your Email</h2>
              <p className="text-slate-400 text-sm mb-6">
                We've sent a verification email to{' '}
                <span className="text-cyan-400 font-medium">{user?.email}</span>
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Click the link in the email to verify your account. If you don't see it, check your spam folder.
              </p>
              <button
                onClick={handleResend}
                disabled={isResending}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20"
              >
                {isResending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Resend Verification Email'
                )}
              </button>
            </div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 rounded-full bg-red-400/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2 text-center">Verification Failed</h2>
              <p className="text-slate-400 text-sm mb-6 text-center">{error}</p>
              <button
                onClick={handleResend}
                disabled={isResending}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20"
              >
                {isResending ? 'Sending...' : 'Request New Link'}
              </button>
            </motion.div>
          )}

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-4 text-sm">
              <Link to="/dashboard" className="text-slate-400 hover:text-cyan-400 transition-colors">
                Continue to Dashboard
              </Link>
              <span className="text-slate-600">•</span>
              <Link to="/auth/login" className="text-slate-400 hover:text-cyan-400 transition-colors">
                Sign Out
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Email verification helps keep your account secure
          </p>
        </div>
      </motion.div>
    </div>
  );
}
