import { Link } from 'react-router-dom';
import {
  Shield, Zap, Lock, Globe, ChevronRight, Check, BarChart3, Brain, Server,
  Network, Eye, AlertTriangle, TrendingUp, Bug, Mail, Activity, FileSearch,
  Code, Database, Cloud, Container, GitBranch, MessageSquare, Key, Users,
  FileText, BookOpen, Phone, MapPin, ExternalLink, Terminal, Cpu, Radio,
  Search, RefreshCw, Filter, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function LandingPage() {
  const [activeDemo, setActiveDemo] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({
    threats: 0,
    blocked: 0,
    uptime: 0,
    response: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const targets = {
      threats: 1247,
      blocked: 45891,
      uptime: 99.9,
      response: 100,
    };

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setAnimatedStats({
        threats: Math.floor(targets.threats * progress),
        blocked: Math.floor(targets.blocked * progress),
        uptime: parseFloat((targets.uptime * progress).toFixed(1)),
        response: Math.floor(targets.response * progress),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const trustedBy = [
    'Microsoft', 'Google', 'Amazon', 'Meta', 'Apple', 'Tesla', 'Netflix', 'IBM'
  ];

  const features = [
    {
      icon: Shield,
      title: 'Advanced Threat Detection',
      description: 'AI-powered real-time threat identification and analysis',
    },
    {
      icon: Lock,
      title: 'Zero-Trust Security',
      description: 'Enterprise-grade protection with continuous verification',
    },
    {
      icon: Globe,
      title: 'Global Threat Intelligence',
      description: 'Access to worldwide threat data and attack patterns',
    },
    {
      icon: Zap,
      title: 'Instant Response',
      description: 'Automated incident response and mitigation',
    },
    {
      icon: Brain,
      title: 'AI Security Assistant',
      description: 'Intelligent assistant for threat analysis and recommendations',
    },
    {
      icon: Network,
      title: 'Network Monitoring',
      description: 'Real-time visibility into network traffic and anomalies',
    },
    {
      icon: Eye,
      title: 'Vulnerability Scanner',
      description: 'Automated scanning and patch management',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Deep insights with interactive dashboards and reports',
    },
  ];

  const detailedFeatures = [
    {
      icon: Brain,
      title: 'AI Threat Detection',
      description: 'Machine learning models trained on millions of threat patterns identify zero-day attacks, anomalies, and sophisticated threats in real-time.',
      capabilities: [
        'Behavioral anomaly detection',
        'Zero-day threat identification',
        'ML-powered pattern recognition',
        'Automated threat correlation',
      ],
      status: 'implemented',
    },
    {
      icon: Search,
      title: 'Vulnerability Scanner',
      description: 'Continuous scanning of infrastructure, applications, and configurations to identify security weaknesses before attackers do.',
      capabilities: [
        'CVE database integration',
        'Automated patch recommendations',
        'Configuration auditing',
        'Risk scoring & prioritization',
      ],
      status: 'implemented',
    },
    {
      icon: Network,
      title: 'Network Monitoring',
      description: 'Deep packet inspection and traffic analysis to detect malicious activity, data exfiltration, and network anomalies.',
      capabilities: [
        'Real-time traffic analysis',
        'DPI & protocol detection',
        'Bandwidth monitoring',
        'Lateral movement detection',
      ],
      status: 'implemented',
    },
    {
      icon: Globe,
      title: 'Threat Intelligence',
      description: 'Integration with global threat feeds, MITRE ATT&CK framework, and real-time intelligence from security communities.',
      capabilities: [
        'MITRE ATT&CK mapping',
        'IOC correlation',
        'Threat actor tracking',
        'Global threat feeds',
      ],
      status: 'implemented',
    },
    {
      icon: Bug,
      title: 'Malware Detection',
      description: 'Multi-layered malware defense with signature-based, heuristic, and sandboxing capabilities to identify and neutralize threats.',
      capabilities: [
        'Static & dynamic analysis',
        'Sandbox execution',
        'File reputation analysis',
        'Automated quarantine',
      ],
      status: 'planned',
    },
    {
      icon: Mail,
      title: 'Phishing Detection',
      description: 'Advanced email and URL analysis to identify phishing attempts, credential harvesting, and social engineering attacks.',
      capabilities: [
        'URL reputation checking',
        'Email header analysis',
        'Domain typosquatting detection',
        'Link rewriting protection',
      ],
      status: 'implemented',
    },
    {
      icon: Activity,
      title: 'Incident Response',
      description: 'Automated playbooks and workflows for rapid incident containment, investigation, and remediation.',
      capabilities: [
        'Automated playbooks',
        'Timeline reconstruction',
        'Evidence collection',
        'Remediation workflows',
      ],
      status: 'planned',
    },
    {
      icon: Brain,
      title: 'AI Security Assistant',
      description: 'Conversational AI trained on security best practices to answer questions, investigate threats, and provide recommendations.',
      capabilities: [
        'Natural language queries',
        'Threat investigation',
        'Security recommendations',
        'Automated reporting',
      ],
      status: 'implemented',
    },
  ];

  const securityFeatures = [
    {
      icon: Shield,
      title: 'Zero Trust Architecture',
      description: 'Never trust, always verify. Every request is authenticated and authorized.',
    },
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'AES-256 encryption for data at rest and TLS 1.3 for data in transit.',
    },
    {
      icon: Users,
      title: 'Role-Based Access Control',
      description: 'Granular permissions and role management for team collaboration.',
    },
    {
      icon: Key,
      title: 'Multi-Factor Authentication',
      description: 'Support for TOTP, hardware tokens, and biometric authentication.',
    },
    {
      icon: FileText,
      title: 'Comprehensive Audit Logs',
      description: 'Immutable logs for compliance and forensic investigations.',
    },
    {
      icon: Cpu,
      title: 'Security-First Design',
      description: 'Built with secure coding practices and regular security audits.',
    },
  ];

  const integrations = [
    { name: 'Microsoft Azure', icon: Cloud, category: 'Cloud' },
    { name: 'AWS', icon: Cloud, category: 'Cloud' },
    { name: 'Google Cloud', icon: Cloud, category: 'Cloud' },
    { name: 'Slack', icon: MessageSquare, category: 'Communication' },
    { name: 'Microsoft Teams', icon: MessageSquare, category: 'Communication' },
    { name: 'GitHub', icon: GitBranch, category: 'DevOps' },
    { name: 'Docker', icon: Container, category: 'DevOps' },
    { name: 'Kubernetes', icon: Container, category: 'DevOps' },
    { name: 'Splunk', icon: Database, category: 'SIEM' },
    { name: 'Elasticsearch', icon: Database, category: 'SIEM' },
    { name: 'Jira', icon: FileText, category: 'Ticketing' },
    { name: 'ServiceNow', icon: FileText, category: 'Ticketing' },
  ];

  const demoFeatures = [
    {
      title: 'Real-Time Threat Dashboard',
      description: 'Monitor threats, incidents, and system health in real-time',
    },
    {
      title: 'Advanced Analytics',
      description: 'Deep insights with interactive charts and visualizations',
    },
    {
      title: 'AI-Powered Detection',
      description: 'Machine learning identifies threats before they impact you',
    },
  ];

  const stats = [
    { value: '99.9%', label: 'Threat Detection Rate' },
    { value: '<100ms', label: 'Average Response Time' },
    { value: '24/7', label: 'Security Monitoring' },
    { value: '150+', label: 'Enterprise Clients' },
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Deploy in Minutes',
      description: 'Quick installation with minimal configuration required',
      icon: Server,
    },
    {
      step: '02',
      title: 'AI Learns Your Network',
      description: 'Machine learning adapts to your unique infrastructure',
      icon: Brain,
    },
    {
      step: '03',
      title: 'Continuous Protection',
      description: '24/7 monitoring with automated threat response',
      icon: Shield,
    },
  ];

  const threatIntelStats = [
    { value: '50M+', label: 'Threat Indicators', icon: AlertTriangle },
    { value: '180+', label: 'Countries Monitored', icon: Globe },
    { value: '99.9%', label: 'Detection Accuracy', icon: TrendingUp },
    { value: '<1s', label: 'Response Time', icon: Zap },
  ];

  const testimonials = [
    {
      quote: 'CyberiumShield AI has transformed our security posture. The AI-driven insights are game-changing.',
      author: 'Sarah Johnson',
      role: 'CISO, TechCorp',
      company: 'Fortune 500 Company',
    },
    {
      quote: 'We reduced incident response time by 80% and caught threats we would have missed otherwise.',
      author: 'Michael Chen',
      role: 'Security Director',
      company: 'Financial Services',
    },
    {
      quote: 'The best security platform we have used. Intuitive, powerful, and constantly improving.',
      author: 'Emily Rodriguez',
      role: 'VP of Security',
      company: 'Healthcare Provider',
    },
  ];

  const faqs = [
    {
      question: 'How quickly can I deploy CyberiumShield AI?',
      answer: 'Most organizations are fully operational within 24 hours. Our streamlined onboarding process and pre-configured templates make deployment fast and efficient.',
    },
    {
      question: 'What integrations are supported?',
      answer: 'We integrate with 100+ security tools including SIEMs, firewalls, EDR solutions, and cloud platforms. Our API allows custom integrations as well.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes. We use military-grade encryption, zero-trust architecture, and follow industry-standard security practices. Our platform is designed with security-first principles.',
    },
    {
      question: 'Can I try before buying?',
      answer: 'Absolutely. We offer a 14-day free trial with full access to all enterprise features. No credit card required.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$99',
      period: '/month',
      features: [
        'Up to 100 devices',
        'Basic threat detection',
        'Email support',
        'Monthly reports',
      ],
    },
    {
      name: 'Professional',
      price: '$299',
      period: '/month',
      popular: true,
      features: [
        'Up to 1,000 devices',
        'Advanced AI protection',
        '24/7 priority support',
        'Real-time analytics',
        'Custom integrations',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: [
        'Unlimited devices',
        'Full SOC platform',
        'Dedicated support team',
        'Custom AI training',
        'White-label options',
      ],
    },
  ];

  const resources = [
    {
      icon: BookOpen,
      title: 'Documentation',
      description: 'Comprehensive guides and API reference',
      link: '/docs',
    },
    {
      icon: Code,
      title: 'API Reference',
      description: 'RESTful API for custom integrations',
      link: '/api',
    },
    {
      icon: Terminal,
      title: 'Developer Tools',
      description: 'SDKs, CLI tools, and libraries',
      link: '/developers',
    },
    {
      icon: Radio,
      title: 'Security Blog',
      description: 'Latest threat intelligence and insights',
      link: '/blog',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                CyberiumShield AI
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-cyan-400 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-slate-300 hover:text-cyan-400 transition-colors">
                Pricing
              </a>
              <a href="#resources" className="text-slate-300 hover:text-cyan-400 transition-colors">
                Resources
              </a>
              <Link
                to="/auth/login"
                className="text-slate-300 hover:text-cyan-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-cyan-400/20"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl top-20 left-10 animate-pulse" />
          <div className="absolute w-96 h-96 bg-blue-400/10 rounded-full blur-3xl bottom-20 right-10 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Next-Gen Cybersecurity
              </span>
              <br />
              <span className="text-slate-200">Powered by AI</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 mb-8 max-w-3xl mx-auto leading-relaxed">
              Protect your digital assets with advanced AI-driven threat detection,
              real-time monitoring, and automated incident response.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth/register"
                className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-xl shadow-cyan-400/30 hover:shadow-cyan-400/50 flex items-center gap-2"
              >
                Start Free Trial
                <ChevronRight className="w-5 h-5" />
              </Link>
              <a
                href="#demo"
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold rounded-lg transition-all"
              >
                Watch Demo
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-slate-500 text-sm uppercase tracking-wider mb-8">
            Trusted by Industry Leaders
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center">
            {trustedBy.map((company, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="text-center text-slate-500 font-semibold hover:text-cyan-400 transition-colors cursor-default"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Product Demo Section */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
                See CyberiumShield AI in Action
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Experience the power of AI-driven security operations
              </p>
            </motion.div>
          </div>

          {/* Demo Carousel */}
          <div className="mb-12">
            <div className="flex justify-center gap-4 mb-8">
              {demoFeatures.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => setActiveDemo(index)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    activeDemo === index
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-400 text-white shadow-lg shadow-cyan-400/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {feature.title}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeDemo}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="aspect-video bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-400/10">
                  <div className="p-8 h-full">
                    {activeDemo === 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-emerald-400" />
                          </div>
                          <div className="text-slate-400 text-sm">Real-Time Dashboard</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { label: 'Active Threats', value: animatedStats.threats, color: 'text-red-400' },
                            { label: 'Blocked Attacks', value: animatedStats.blocked.toLocaleString(), color: 'text-emerald-400' },
                            { label: 'Uptime', value: `${animatedStats.uptime}%`, color: 'text-cyan-400' },
                            { label: 'Avg Response', value: `${animatedStats.response}ms`, color: 'text-blue-400' },
                          ].map((stat, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="p-6 bg-[#0B1120]/80 border border-white/5 rounded-xl"
                            >
                              <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                                {stat.value}
                              </div>
                              <div className="text-sm text-slate-400">{stat.label}</div>
                            </motion.div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2 h-48 bg-[#0B1120]/80 border border-white/5 rounded-xl p-4">
                            <div className="text-slate-300 font-medium mb-3">Threat Activity (Last 24h)</div>
                            <div className="relative h-32">
                              {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ height: 0 }}
                                  animate={{ height: `${height}%` }}
                                  transition={{ delay: 0.5 + i * 0.1 }}
                                  className="absolute bottom-0 bg-gradient-to-t from-cyan-400 to-blue-400 rounded-t"
                                  style={{ left: `${i * 14}%`, width: '10%' }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="h-48 bg-[#0B1120]/80 border border-white/5 rounded-xl p-4">
                            <div className="text-slate-300 font-medium mb-3">System Health</div>
                            <div className="flex items-center justify-center h-32">
                              <div className="relative w-32 h-32">
                                <svg className="transform -rotate-90" width="128" height="128">
                                  <circle cx="64" cy="64" r="56" fill="none" stroke="#1e293b" strokeWidth="8" />
                                  <motion.circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: '0 352' }}
                                    animate={{ strokeDasharray: '330 352' }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                  />
                                  <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#22d3ee" />
                                      <stop offset="100%" stopColor="#60a5fa" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-400">98%</div>
                                    <div className="text-xs text-slate-400">Healthy</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeDemo === 1 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="text-slate-200 font-semibold text-lg">Analytics Dashboard</div>
                          <div className="flex gap-2">
                            <div className="px-3 py-1 bg-white/5 rounded-lg text-slate-400 text-sm">Last 7 Days</div>
                            <RefreshCw className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-[#0B1120]/80 border border-white/5 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-slate-300 font-medium">Threat Types</div>
                              <Filter className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="space-y-3">
                              {[
                                { name: 'Malware', count: 487, color: 'bg-red-400' },
                                { name: 'Phishing', count: 321, color: 'bg-yellow-400' },
                                { name: 'DDoS', count: 234, color: 'bg-orange-400' },
                                { name: 'Brute Force', count: 205, color: 'bg-purple-400' },
                              ].map((threat, i) => (
                                <div key={i} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-300">{threat.name}</span>
                                    <span className="text-slate-400">{threat.count}</span>
                                  </div>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(threat.count / 487) * 100}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    className={`h-2 ${threat.color} rounded-full`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="p-6 bg-[#0B1120]/80 border border-white/5 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-slate-300 font-medium">Attack Sources</div>
                              <Globe className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="space-y-3">
                              {[
                                { country: 'Russia', percentage: 28 },
                                { country: 'China', percentage: 23 },
                                { country: 'USA', percentage: 18 },
                                { country: 'Germany', percentage: 15 },
                                { country: 'Brazil', percentage: 16 },
                              ].map((source, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-20 text-slate-300 text-sm">{source.country}</div>
                                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${source.percentage}%` }}
                                      transition={{ duration: 1, delay: i * 0.1 }}
                                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                                    />
                                  </div>
                                  <div className="w-12 text-right text-slate-400 text-sm">{source.percentage}%</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="p-6 bg-[#0B1120]/80 border border-white/5 rounded-xl">
                          <div className="text-slate-300 font-medium mb-4">Recent Incidents</div>
                          <div className="space-y-3">
                            {[
                              { time: '2 min ago', severity: 'Critical', type: 'SQL Injection Attempt', ip: '192.168.1.50' },
                              { time: '15 min ago', severity: 'High', type: 'Suspicious Login', ip: '10.0.0.45' },
                              { time: '1 hour ago', severity: 'Medium', type: 'Port Scanning', ip: '172.16.0.12' },
                            ].map((incident, i) => (
                              <motion.div
                                key={i}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                              >
                                <div className={`w-2 h-2 rounded-full ${
                                  incident.severity === 'Critical' ? 'bg-red-400' :
                                  incident.severity === 'High' ? 'bg-orange-400' : 'bg-yellow-400'
                                }`} />
                                <div className="flex-1">
                                  <div className="text-slate-200 text-sm font-medium">{incident.type}</div>
                                  <div className="text-slate-500 text-xs">{incident.ip}</div>
                                </div>
                                <div className="text-slate-400 text-xs">{incident.time}</div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeDemo === 2 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="text-slate-200 font-semibold text-lg">AI Detection Engine</div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 text-sm">Active</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2 p-6 bg-[#0B1120]/80 border border-white/5 rounded-xl">
                            <div className="text-slate-300 font-medium mb-4">Threat Detection Pipeline</div>
                            <div className="space-y-4">
                              {[
                                { stage: 'Data Collection', status: 'complete', items: '1.2M events/sec' },
                                { stage: 'Pattern Analysis', status: 'processing', items: '847K analyzed' },
                                { stage: 'ML Classification', status: 'processing', items: '234K classified' },
                                { stage: 'Threat Scoring', status: 'queued', items: '89K queued' },
                              ].map((stage, i) => (
                                <div key={i} className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    stage.status === 'complete' ? 'bg-emerald-400/20 text-emerald-400' :
                                    stage.status === 'processing' ? 'bg-cyan-400/20 text-cyan-400' :
                                    'bg-slate-400/20 text-slate-400'
                                  }`}>
                                    {stage.status === 'complete' ? <Check className="w-4 h-4" /> :
                                     stage.status === 'processing' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                                     <div className="w-2 h-2 rounded-full bg-slate-400" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-slate-200 text-sm font-medium">{stage.stage}</div>
                                    <div className="text-slate-500 text-xs">{stage.items}</div>
                                  </div>
                                  {stage.status === 'processing' && (
                                    <motion.div
                                      animate={{ opacity: [0.5, 1, 0.5] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="flex gap-1"
                                    >
                                      <div className="w-1 h-4 bg-cyan-400 rounded" />
                                      <div className="w-1 h-4 bg-cyan-400 rounded" style={{ animationDelay: '0.2s' }} />
                                      <div className="w-1 h-4 bg-cyan-400 rounded" style={{ animationDelay: '0.4s' }} />
                                    </motion.div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="p-6 bg-[#0B1120]/80 border border-white/5 rounded-xl">
                            <div className="text-slate-300 font-medium mb-4">Model Performance</div>
                            <div className="space-y-4">
                              {[
                                { metric: 'Accuracy', value: 99.8 },
                                { metric: 'Precision', value: 98.5 },
                                { metric: 'Recall', value: 97.2 },
                                { metric: 'F1 Score', value: 97.8 },
                              ].map((metric, i) => (
                                <div key={i} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-300">{metric.metric}</span>
                                    <span className="text-cyan-400 font-semibold">{metric.value}%</span>
                                  </div>
                                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${metric.value}%` }}
                                      transition={{ duration: 1, delay: i * 0.1 }}
                                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="p-6 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 border border-cyan-400/30 rounded-xl">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center shrink-0">
                              <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="text-slate-200 font-semibold mb-1">AI Recommendation</div>
                              <p className="text-slate-300 text-sm mb-3">
                                Detected unusual outbound traffic pattern from server cluster B. Recommend immediate investigation - possible data exfiltration attempt.
                              </p>
                              <div className="flex gap-2">
                                <button className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-400 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                                  Investigate
                                </button>
                                <button className="px-4 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-lg text-sm font-medium hover:bg-white/10 transition-all">
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center mt-8">
                  <p className="text-slate-400 text-sm">{demoFeatures[activeDemo].description}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Detailed Feature Showcase */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
                Complete Security Platform
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Every tool you need to protect your organization
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {detailedFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-8 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-400/30 transition-all hover:shadow-xl hover:shadow-cyan-400/10"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-200">
                        {feature.title}
                      </h3>
                      {feature.status === 'implemented' ? (
                        <span className="px-2 py-1 bg-emerald-400/20 text-emerald-400 text-xs font-semibold rounded-full">
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-400/20 text-blue-400 text-xs font-semibold rounded-full">
                          ROADMAP
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {feature.capabilities.map((capability, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-slate-300 text-sm">{capability}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              Enterprise-Grade Security Features
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Comprehensive protection powered by artificial intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-400/30 transition-all hover:scale-105"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
                Security & Compliance First
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Built with industry-leading security practices and standards
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-400/30 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 p-8 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 border border-cyan-400/30 rounded-2xl"
          >
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">
                  Enterprise Security Architecture
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  CyberiumShield AI is designed with a security-first approach. We employ defense-in-depth strategies,
                  conduct regular security audits, and follow secure development practices. Our architecture includes
                  encrypted data storage, secure API communications, and comprehensive logging for compliance and forensics.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
                Seamless Integrations
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Connect with your existing security stack and workflows
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {integrations.map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="p-6 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-xl hover:border-cyan-400/30 transition-all hover:scale-105 text-center group"
              >
                <integration.icon className="w-8 h-8 text-slate-400 group-hover:text-cyan-400 transition-colors mx-auto mb-3" />
                <div className="text-slate-200 font-medium mb-1">{integration.name}</div>
                <div className="text-slate-500 text-xs">{integration.category}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center shrink-0">
                  <Code className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-1">
                    RESTful API
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Build custom integrations with our comprehensive API
                  </p>
                </div>
              </div>
              <a
                href="/api"
                className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20 flex items-center gap-2"
              >
                View API Docs
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Get enterprise-grade security in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-400/20 border border-cyan-400/30 flex items-center justify-center">
                    <step.icon className="w-10 h-10 text-cyan-400" />
                  </div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-200 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-400">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-cyan-400/50 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              Command Center Dashboard
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Real-time visibility into your entire security infrastructure
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-video bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-400/10">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-slate-400 text-sm">CyberiumShield AI Dashboard</div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {threatIntelStats.map((stat, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[#0B1120]/80 border border-white/5 rounded-xl"
                    >
                      <stat.icon className="w-6 h-6 text-cyan-400 mb-2" />
                      <div className="text-2xl font-bold text-slate-200">{stat.value}</div>
                      <div className="text-xs text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 h-40 bg-[#0B1120]/80 border border-white/5 rounded-xl p-4">
                    <div className="text-slate-300 text-sm mb-2">Threat Activity (24h)</div>
                    <div className="h-24 bg-gradient-to-t from-cyan-400/20 to-transparent rounded" />
                  </div>
                  <div className="h-40 bg-[#0B1120]/80 border border-white/5 rounded-xl p-4">
                    <div className="text-slate-300 text-sm mb-2">Threat Types</div>
                    <div className="flex items-center justify-center h-24">
                      <div className="w-20 h-20 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Assistant Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 border border-cyan-400/30 rounded-full mb-6">
                <span className="text-cyan-400 font-semibold text-sm">AI-POWERED INSIGHTS</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-6">
                Your AI Security Assistant
              </h2>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Ask questions, get instant threat analysis, and receive intelligent recommendations from our advanced AI assistant trained on millions of security incidents.
              </p>
              <ul className="space-y-4">
                {[
                  'Natural language threat queries',
                  'Automated incident investigation',
                  'Real-time security recommendations',
                  'Contextual vulnerability analysis',
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-slate-200 font-semibold">AI Assistant</div>
                    <div className="text-xs text-emerald-400">● Online</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-slate-300 text-sm">
                        Analyze recent failed login attempts from IP 192.168.1.50
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-cyan-400/10 border border-cyan-400/30 rounded-xl p-4">
                      <p className="text-slate-200 text-sm mb-2">
                        I've analyzed 47 failed login attempts in the last hour:
                      </p>
                      <ul className="text-slate-300 text-sm space-y-1 ml-4 list-disc">
                        <li>Brute force attack detected</li>
                        <li>Source: 192.168.1.50 (Russia)</li>
                        <li>Recommendation: Block IP immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Ask anything about your security..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50"
                    disabled
                  />
                  <button className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-400 text-white rounded-lg font-medium text-sm">
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Global Threat Map Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              Global Threat Intelligence
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Real-time monitoring of cyber threats across 180+ countries
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-video bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden p-8">
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20" />
                <Globe className="w-48 h-48 text-cyan-400/30 animate-pulse" />
                <div className="absolute top-10 left-20 w-4 h-4 rounded-full bg-red-400 animate-ping" />
                <div className="absolute top-20 right-32 w-4 h-4 rounded-full bg-yellow-400 animate-ping" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-24 left-1/3 w-4 h-4 rounded-full bg-emerald-400 animate-ping" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-16 right-20 w-4 h-4 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '1.5s' }} />

                <div className="absolute top-8 left-24 bg-[#0B1120]/90 border border-red-400/50 rounded-lg px-3 py-2 text-xs">
                  <div className="text-red-400 font-semibold">Critical: DDoS Attack</div>
                  <div className="text-slate-400">North America</div>
                </div>

                <div className="absolute top-24 right-36 bg-[#0B1120]/90 border border-yellow-400/50 rounded-lg px-3 py-2 text-xs">
                  <div className="text-yellow-400 font-semibold">Medium: Phishing</div>
                  <div className="text-slate-400">Europe</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              {[
                { label: 'Active Threats', value: '1,247', color: 'text-red-400' },
                { label: 'Blocked Attacks', value: '45,891', color: 'text-emerald-400' },
                { label: 'Countries', value: '180+', color: 'text-cyan-400' },
                { label: 'Data Points', value: '50M+', color: 'text-blue-400' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              Trusted by Security Leaders
            </h2>
            <p className="text-xl text-slate-400">
              See what our customers say about CyberiumShield AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-400/30 transition-all"
              >
                <div className="mb-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 text-yellow-400">★</div>
                    ))}
                  </div>
                  <p className="text-slate-300 italic leading-relaxed">"{testimonial.quote}"</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="font-semibold text-slate-200">{testimonial.author}</div>
                  <div className="text-sm text-slate-400">{testimonial.role}</div>
                  <div className="text-xs text-cyan-400 mt-1">{testimonial.company}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-400">
              Everything you need to know about CyberiumShield AI
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-400/30 transition-all"
              >
                <h3 className="text-xl font-semibold text-slate-200 mb-3">
                  {faq.question}
                </h3>
                <p className="text-slate-400 leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section id="resources" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              Documentation & Resources
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Everything you need to get started and succeed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource, index) => (
              <motion.a
                key={index}
                href={resource.link}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-6 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-cyan-400/30 transition-all hover:scale-105"
              >
                <resource.icon className="w-10 h-10 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  {resource.title}
                </h3>
                <p className="text-slate-400 text-sm">{resource.description}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-400">Choose the plan that fits your needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`p-8 rounded-2xl border transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-br from-cyan-400/10 to-blue-400/10 border-cyan-400/30 shadow-xl shadow-cyan-400/20 scale-105'
                    : 'bg-[#0F1729]/50 backdrop-blur-xl border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="inline-block px-3 py-1 bg-gradient-to-r from-cyan-400 to-blue-400 text-white text-xs font-semibold rounded-full mb-4">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold text-slate-200 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-cyan-400">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth/register"
                  className={`block w-full py-3 px-4 text-center font-semibold rounded-lg transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-400/30'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200'
                  }`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-6">
                Get in Touch
              </h2>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Have questions? Our team is here to help you secure your organization.
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-slate-200 font-semibold mb-1">Email</div>
                    <a href="mailto:contact@cyberiumshield.ai" className="text-slate-400 hover:text-cyan-400 transition-colors">
                      contact@cyberiumshield.ai
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-slate-200 font-semibold mb-1">Phone</div>
                    <a href="tel:+1-555-0123" className="text-slate-400 hover:text-cyan-400 transition-colors">
                      +1 (555) 012-3456
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-slate-200 font-semibold mb-1">Office</div>
                    <p className="text-slate-400">
                      123 Security Boulevard<br />
                      San Francisco, CA 94105
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl"
            >
              <form className="space-y-6">
                <div>
                  <label className="block text-slate-200 font-medium mb-2">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-slate-200 font-medium mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-200 font-medium mb-2">Message</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
                    placeholder="Tell us about your security needs..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-400/20"
                >
                  Send Message
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#07111F]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="p-12 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 backdrop-blur-xl border border-cyan-400/30 rounded-3xl text-center"
          >
            <h2 className="text-4xl font-bold text-slate-200 mb-4">
              Ready to Secure Your Digital Future?
            </h2>
            <p className="text-xl text-slate-400 mb-8">
              Join thousands of organizations protecting their assets with CyberiumShield AI
            </p>
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-xl shadow-cyan-400/30 hover:shadow-cyan-400/50"
            >
              Start Your Free Trial
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  CyberiumShield AI
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                Next-generation cybersecurity powered by artificial intelligence.
                Protecting organizations worldwide with advanced threat detection and automated response.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.6c-.9.4-1.8.7-2.8.8 1-.6 1.8-1.6 2.2-2.7-1 .6-2 1-3.1 1.2-.9-1-2.2-1.6-3.6-1.6-2.7 0-4.9 2.2-4.9 4.9 0 .4 0 .8.1 1.1C7.7 8.1 4.1 6.1 1.7 3.1c-.4.7-.6 1.6-.6 2.5 0 1.7.9 3.2 2.2 4.1-.8 0-1.6-.2-2.2-.6v.1c0 2.4 1.7 4.4 3.9 4.8-.4.1-.8.2-1.3.2-.3 0-.6 0-.9-.1.6 2 2.4 3.4 4.6 3.4-1.7 1.3-3.8 2.1-6.1 2.1-.4 0-.8 0-1.2-.1 2.2 1.4 4.8 2.2 7.5 2.2 9.1 0 14-7.5 14-14v-.6c1-.7 1.8-1.6 2.5-2.5z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm3 8h-1.4c-1 0-1.2.5-1.2 1.2V11h2.6l-.3 2.6h-2.3V20H9.3v-6.4H7.6V11h1.7V8.7C9.3 6.9 10.4 6 12 6c.8 0 1.5.1 1.7.1V8z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.2-.1-4.8-1.7-4.9-4.9-.1-1.2-.1-1.6-.1-4.8s0-3.6.1-4.8c.1-3.2 1.7-4.8 4.9-4.9 1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8c-3.4 0-6.2 2.8-6.2 6.2s2.8 6.2 6.2 6.2 6.2-2.8 6.2-6.2-2.8-6.2-6.2-6.2zM12 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm6.4-11.8c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4 1.4-.6 1.4-1.4-.6-1.4-1.4-1.4z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6zM8.9 18.9H6.1V9.7h2.8v9.2zM7.5 8.4c-.9 0-1.6-.7-1.6-1.6s.7-1.6 1.6-1.6 1.6.7 1.6 1.6-.7 1.6-1.6 1.6zm11.4 10.5h-2.8v-4.5c0-1.1 0-2.5-1.5-2.5s-1.7 1.2-1.7 2.4v4.6h-2.8V9.7h2.7v1.3h0c.4-.7 1.3-1.5 2.7-1.5 2.9 0 3.4 1.9 3.4 4.4v5z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-cyan-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</a></li>
                <li><a href="#integrations" className="hover:text-cyan-400 transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#about" className="hover:text-cyan-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Careers</a></li>
                <li><a href="#contact" className="hover:text-cyan-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm text-center md:text-left">
              © 2026 CyberiumShield AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-slate-500 text-sm">
              <a href="#" className="hover:text-cyan-400 transition-colors">Status</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Support</a>
              <a href="#resources" className="hover:text-cyan-400 transition-colors">Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
