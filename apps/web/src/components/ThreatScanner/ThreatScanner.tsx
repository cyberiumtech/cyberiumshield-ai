import React, { useState } from 'react';
import { Search, Mail, Link as LinkIcon, AlertTriangle, Shield, CheckCircle, XCircle, Clock, Globe, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../shared/Badge';

type ScanType = 'url' | 'email';

interface ScanResult {
  input: string;
  type: ScanType;
  status: 'safe' | 'suspicious' | 'malicious' | 'unknown';
  threatScore: number;
  indicators: {
    label: string;
    value: string;
    severity: 'safe' | 'warning' | 'danger';
  }[];
  detectedThreats: string[];
  recommendations: string[];
  scanTime: number;
  timestamp: Date;
}

export function ThreatScanner() {
  const [scanType, setScanType] = useState<ScanType>('url');
  const [input, setInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  // URL validation regex
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Email validation regex
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Suspicious indicators for URLs
  const checkUrlThreats = (url: string): ScanResult => {
    const threats: string[] = [];
    const indicators: ScanResult['indicators'] = [];
    let threatScore = 0;

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();
      const protocol = urlObj.protocol;

      // Check protocol
      if (protocol === 'http:') {
        threats.push('Insecure HTTP connection detected');
        indicators.push({ label: 'Protocol', value: 'HTTP (Not Secure)', severity: 'warning' });
        threatScore += 15;
      } else {
        indicators.push({ label: 'Protocol', value: 'HTTPS (Secure)', severity: 'safe' });
      }

      // Check for suspicious domains
      const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co'];
      const isSuspiciousDomain = suspiciousDomains.some(d => domain.includes(d));
      if (isSuspiciousDomain) {
        threats.push('URL shortener detected - could hide malicious destination');
        threatScore += 25;
      }

      // Check for typosquatting patterns
      const commonBrands = ['paypal', 'microsoft', 'google', 'amazon', 'facebook', 'apple', 'netflix', 'bank'];
      const typoPatterns = ['paypa1', 'micros0ft', 'g00gle', 'amaz0n', 'faceb00k', 'app1e', 'netf1ix'];

      const hasTypo = typoPatterns.some(pattern => domain.includes(pattern));
      if (hasTypo) {
        threats.push('Potential typosquatting detected - domain mimics legitimate brand');
        threatScore += 40;
      }

      // Check for suspicious TLDs
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work'];
      const hasSuspiciousTld = suspiciousTlds.some(tld => domain.endsWith(tld));
      if (hasSuspiciousTld) {
        threats.push('Suspicious top-level domain (TLD) commonly used in phishing');
        threatScore += 20;
      }

      // Check for IP address instead of domain
      const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (ipPattern.test(domain)) {
        threats.push('Direct IP address instead of domain name');
        indicators.push({ label: 'Domain Type', value: 'IP Address', severity: 'warning' });
        threatScore += 20;
      } else {
        indicators.push({ label: 'Domain', value: domain, severity: 'safe' });
      }

      // Check for suspicious path patterns
      const suspiciousPathKeywords = ['login', 'verify', 'account', 'secure', 'update', 'confirm', 'banking'];
      const hasSuspiciousPath = suspiciousPathKeywords.some(keyword => path.includes(keyword));
      if (hasSuspiciousPath) {
        threats.push('Suspicious path pattern detected');
        threatScore += 15;
      }

      // Check for excessive subdomains
      const subdomainCount = domain.split('.').length - 2;
      if (subdomainCount > 2) {
        threats.push('Excessive subdomains detected');
        threatScore += 10;
      }

      // Check URL length
      if (url.length > 150) {
        threats.push('Unusually long URL - common in phishing attacks');
        threatScore += 10;
      }

      // Check for special characters in domain
      if (/[^\w.-]/.test(domain)) {
        threats.push('Unusual characters in domain name');
        threatScore += 15;
      }

      indicators.push({
        label: 'URL Length',
        value: `${url.length} characters`,
        severity: url.length > 150 ? 'warning' : 'safe'
      });

      indicators.push({
        label: 'Subdomain Count',
        value: subdomainCount.toString(),
        severity: subdomainCount > 2 ? 'warning' : 'safe'
      });

    } catch (error) {
      threats.push('Invalid or malformed URL');
      threatScore = 100;
    }

    // Determine status
    let status: ScanResult['status'] = 'safe';
    if (threatScore >= 60) status = 'malicious';
    else if (threatScore >= 30) status = 'suspicious';
    else if (threatScore > 0) status = 'suspicious';

    // Generate recommendations
    const recommendations: string[] = [];
    if (status === 'malicious') {
      recommendations.push('DO NOT visit this URL');
      recommendations.push('Block this URL in your security systems');
      recommendations.push('Report this URL to security team');
    } else if (status === 'suspicious') {
      recommendations.push('Exercise caution before visiting this URL');
      recommendations.push('Verify the URL with the sender');
      recommendations.push('Use a sandbox environment if you must visit');
    } else {
      recommendations.push('URL appears safe, but always verify the source');
      recommendations.push('Keep your browser and security software updated');
    }

    return {
      input: url,
      type: 'url',
      status,
      threatScore,
      indicators,
      detectedThreats: threats,
      recommendations,
      scanTime: Math.floor(Math.random() * 500) + 200,
      timestamp: new Date(),
    };
  };

  // Suspicious indicators for emails
  const checkEmailThreats = (email: string): ScanResult => {
    const threats: string[] = [];
    const indicators: ScanResult['indicators'] = [];
    let threatScore = 0;

    try {
      const [localPart, domain] = email.toLowerCase().split('@');

      // Check domain
      const suspiciousDomains = ['tempmail', 'guerrillamail', '10minutemail', 'throwaway', 'disposable'];
      const isSuspiciousDomain = suspiciousDomains.some(d => domain.includes(d));
      if (isSuspiciousDomain) {
        threats.push('Temporary/disposable email service detected');
        threatScore += 30;
      }

      // Check for free email providers (lower risk but worth noting)
      const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const isFreeProvider = freeProviders.includes(domain);
      indicators.push({
        label: 'Email Provider',
        value: isFreeProvider ? 'Free Provider' : 'Custom Domain',
        severity: 'safe'
      });

      // Check for suspicious TLDs
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.ru', '.cn'];
      const hasSuspiciousTld = suspiciousTlds.some(tld => domain.endsWith(tld));
      if (hasSuspiciousTld) {
        threats.push('Email domain uses suspicious TLD');
        threatScore += 25;
      }

      // Check for typosquatting in domain
      const typoPatterns = ['gmai1', 'yah00', 'outl00k', 'hotmai1'];
      const hasTypo = typoPatterns.some(pattern => domain.includes(pattern));
      if (hasTypo) {
        threats.push('Potential typosquatting in email domain');
        threatScore += 40;
      }

      // Check local part for suspicious patterns
      if (localPart.includes('noreply') || localPart.includes('no-reply')) {
        indicators.push({ label: 'Type', value: 'System/Automated', severity: 'safe' });
      }

      // Check for excessive numbers
      const numberCount = (localPart.match(/\d/g) || []).length;
      if (numberCount > 5) {
        threats.push('Excessive numbers in email address');
        threatScore += 15;
      }

      // Check for suspicious keywords
      const suspiciousKeywords = ['admin', 'security', 'support', 'verify', 'confirm', 'urgent'];
      const hasSuspiciousKeyword = suspiciousKeywords.some(keyword => localPart.includes(keyword));
      if (hasSuspiciousKeyword) {
        threats.push('Email contains keywords commonly used in phishing');
        threatScore += 20;
      }

      // Check length
      if (email.length > 50) {
        threats.push('Unusually long email address');
        threatScore += 10;
      }

      indicators.push({ label: 'Domain', value: domain, severity: hasSuspiciousTld ? 'warning' : 'safe' });
      indicators.push({
        label: 'Length',
        value: `${email.length} characters`,
        severity: email.length > 50 ? 'warning' : 'safe'
      });

    } catch (error) {
      threats.push('Invalid email format');
      threatScore = 100;
    }

    // Determine status
    let status: ScanResult['status'] = 'safe';
    if (threatScore >= 60) status = 'malicious';
    else if (threatScore >= 30) status = 'suspicious';
    else if (threatScore > 0) status = 'suspicious';

    // Generate recommendations
    const recommendations: string[] = [];
    if (status === 'malicious') {
      recommendations.push('DO NOT respond to emails from this address');
      recommendations.push('Block this sender in your email system');
      recommendations.push('Report to your security team');
    } else if (status === 'suspicious') {
      recommendations.push('Verify sender identity before responding');
      recommendations.push('Check for additional authentication');
      recommendations.push('Do not click links in emails from this sender');
    } else {
      recommendations.push('Email appears legitimate, but verify sender identity');
      recommendations.push('Be cautious with links and attachments');
    }

    return {
      input: email,
      type: 'email',
      status,
      threatScore,
      indicators,
      detectedThreats: threats,
      recommendations,
      scanTime: Math.floor(Math.random() * 400) + 150,
      timestamp: new Date(),
    };
  };

  const handleScan = async () => {
    if (!input.trim()) return;

    // Validate input
    if (scanType === 'url' && !isValidUrl(input)) {
      alert('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    if (scanType === 'email' && !isValidEmail(input)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsScanning(true);
    setResult(null);

    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Perform scan
    const scanResult = scanType === 'url'
      ? checkUrlThreats(input)
      : checkEmailThreats(input);

    setResult(scanResult);
    setIsScanning(false);
  };

  const getStatusColor = (status: ScanResult['status']) => {
    switch (status) {
      case 'safe': return 'text-emerald-400';
      case 'suspicious': return 'text-yellow-400';
      case 'malicious': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: ScanResult['status']) => {
    switch (status) {
      case 'safe': return <CheckCircle className="w-8 h-8" />;
      case 'suspicious': return <AlertTriangle className="w-8 h-8" />;
      case 'malicious': return <XCircle className="w-8 h-8" />;
      default: return <Shield className="w-8 h-8" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Interface */}
      <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Threat Scanner</h3>

        {/* Scan Type Toggle */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setScanType('url')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              scanType === 'url'
                ? 'bg-cyan-400/20 border border-cyan-400/30 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Scan URL
          </button>
          <button
            onClick={() => setScanType('email')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              scanType === 'email'
                ? 'bg-cyan-400/20 border border-cyan-400/30 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Mail className="w-4 h-4" />
            Scan Email
          </button>
        </div>

        {/* Input Field */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            {scanType === 'url' ? (
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            ) : (
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleScan()}
              placeholder={
                scanType === 'url'
                  ? 'Enter URL (e.g., https://example.com)'
                  : 'Enter email address (e.g., user@example.com)'
              }
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
          </div>
          <button
            onClick={handleScan}
            disabled={isScanning || !input.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
          >
            {isScanning ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Scan Now
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          {scanType === 'url'
            ? 'Enter any URL to check for phishing, malware, and other threats'
            : 'Enter any email address to check for suspicious patterns and potential threats'}
        </p>
      </div>

      {/* Scan Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          >
            {/* Status Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`${getStatusColor(result.status)}`}>
                  {getStatusIcon(result.status)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-200 capitalize">{result.status}</h3>
                  <p className="text-sm text-slate-400">Threat Score: {result.threatScore}/100</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Scan completed in {result.scanTime}ms</p>
                <p className="text-xs text-slate-500">{result.timestamp.toLocaleString()}</p>
              </div>
            </div>

            {/* Scanned Input */}
            <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">Scanned {result.type.toUpperCase()}</p>
              <p className="text-sm text-slate-200 font-mono break-all">{result.input}</p>
            </div>

            {/* Indicators */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Analysis Indicators</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.indicators.map((indicator, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <span className="text-xs text-slate-400">{indicator.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200 font-medium">{indicator.value}</span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          indicator.severity === 'safe'
                            ? 'bg-emerald-400'
                            : indicator.severity === 'warning'
                            ? 'bg-yellow-400'
                            : 'bg-red-400'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected Threats */}
            {result.detectedThreats.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Detected Threats ({result.detectedThreats.length})</h4>
                <div className="space-y-2">
                  {result.detectedThreats.map((threat, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-red-400/10 border border-red-400/30"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-200">{threat}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Recommendations</h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-cyan-400/10 border border-cyan-400/30"
                  >
                    <Shield className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-200">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
