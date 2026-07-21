import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Lock, User, Building, AlertCircle, Eye, EyeOff, Check, Globe, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [error, setError] = useState('');
  const { register, isRegisterLoading } = useAuth();

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*]/.test(password) },
  ];

  const generateSlug = (orgName: string) => {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOrganizationChange = (value: string) => {
    setOrganization(value);
    if (!organizationSlug || organizationSlug === generateSlug(organization)) {
      setOrganizationSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !organization || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const allRequirementsMet = passwordRequirements.every(req => req.met);
    if (!allRequirementsMet) {
      setError('Password does not meet security requirements');
      return;
    }

    if (!agreeToTerms || !agreeToPrivacy) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: confirmPassword,
        organization_name: organization,
        organization_slug: organizationSlug,
        country,
        timezone,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
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
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 mb-4 shadow-lg shadow-cyan-400/50">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            CyberiumShield AI
          </h1>
          <p className="text-slate-400 text-sm">Create Your Account</p>
        </div>

        {/* Register Card */}
        <div className="bg-[#0F1729]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Get Started</h2>
            <p className="text-slate-400 text-sm">Join the next generation of cybersecurity</p>
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
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Anderson"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
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
                  placeholder="you@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Organization Field */}
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-slate-300 mb-2">
                Organization Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="organization"
                  type="text"
                  value={organization}
                  onChange={(e) => handleOrganizationChange(e.target.value)}
                  placeholder="Acme Security Corp"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                  required
                />
              </div>
            </div>

            {/* Organization Slug */}
            <div>
              <label htmlFor="organizationSlug" className="block text-sm font-medium text-slate-300 mb-2">
                Organization Slug
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="organizationSlug"
                  type="text"
                  value={organizationSlug}
                  onChange={(e) => setOrganizationSlug(e.target.value)}
                  placeholder="acme-security-corp"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Used for your organization's URL: cyberiumshield.ai/{organizationSlug || 'your-org'}
              </p>
            </div>

            {/* Country & Timezone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-slate-300 mb-2">
                  Country
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                  >
                    <option value="">Select</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="IN">India</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-slate-300 mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                  >
                    <option value="">Select</option>
                    <option value="America/New_York">EST</option>
                    <option value="America/Chicago">CST</option>
                    <option value="America/Denver">MST</option>
                    <option value="America/Los_Angeles">PST</option>
                    <option value="Europe/London">GMT</option>
                    <option value="Europe/Paris">CET</option>
                    <option value="Asia/Tokyo">JST</option>
                    <option value="Asia/Kolkata">IST</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
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

              {/* Password Requirements */}
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

            {/* Confirm Password Field */}
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

            {/* Terms Agreement */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-400 focus:ring-cyan-400/50 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-400">
                  I agree to the{' '}
                  <Link to="/terms" className="text-cyan-400 hover:text-cyan-300">
                    Terms of Service
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeToPrivacy}
                  onChange={(e) => setAgreeToPrivacy(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-400 focus:ring-cyan-400/50 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-400">
                  I agree to the{' '}
                  <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isRegisterLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40"
            >
              {isRegisterLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                to="/auth/login"
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Your data is encrypted and protected by industry-standard security
          </p>
        </div>
      </motion.div>
    </div>
  );
}
