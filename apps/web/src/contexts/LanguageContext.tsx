import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ne';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations = {
  en: {
    // Dashboard
    'dashboard.title': 'Security Dashboard',
    'dashboard.subtitle': 'Real-time security monitoring and threat intelligence',
    'dashboard.securityScore': 'Security Score',
    'dashboard.activeThreats': 'Active Threats',
    'dashboard.vulnerabilities': 'Vulnerabilities',
    'dashboard.systemHealth': 'System Health',
    'dashboard.recentIncidents': 'Recent Incidents',

    // Security Center
    'securityCenter.title': 'Security Center',
    'securityCenter.subtitle': 'Monitor security alerts, policies, and compliance status',
    'securityCenter.generateReport': 'Generate Report',
    'securityCenter.securityPosture': 'Security Posture',
    'securityCenter.openAlerts': 'Open Alerts',
    'securityCenter.compliantSystems': 'Compliant Systems',
    'securityCenter.policyViolations': 'Policy Violations',

    // Quick Actions
    'quickActions.newScan': 'New Scan',
    'quickActions.newIncident': 'New Incident',
    'quickActions.generateReport': 'Generate Report',
    'quickActions.askAI': 'Ask AI',
    'quickActions.addUser': 'Add User',

    // Common
    'common.allSystemsOperational': 'All Systems Operational',
    'common.viewAll': 'View All',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
  },
  ne: {
    // Dashboard
    'dashboard.title': 'सुरक्षा ड्यासबोर्ड',
    'dashboard.subtitle': 'वास्तविक-समय सुरक्षा निगरानी र खतरा खुफिया',
    'dashboard.securityScore': 'सुरक्षा स्कोर',
    'dashboard.activeThreats': 'सक्रिय खतराहरू',
    'dashboard.vulnerabilities': 'कमजोरीहरू',
    'dashboard.systemHealth': 'प्रणाली स्वास्थ्य',
    'dashboard.recentIncidents': 'हालका घटनाहरू',

    // Security Center
    'securityCenter.title': 'सुरक्षा केन्द्र',
    'securityCenter.subtitle': 'सुरक्षा अलर्ट, नीति र अनुपालन स्थिति निगरानी गर्नुहोस्',
    'securityCenter.generateReport': 'रिपोर्ट उत्पन्न गर्नुहोस्',
    'securityCenter.securityPosture': 'सुरक्षा स्थिति',
    'securityCenter.openAlerts': 'खुला अलर्टहरू',
    'securityCenter.compliantSystems': 'अनुपालन प्रणालीहरू',
    'securityCenter.policyViolations': 'नीति उल्लङ्घनहरू',

    // Quick Actions
    'quickActions.newScan': 'नयाँ स्क्यान',
    'quickActions.newIncident': 'नयाँ घटना',
    'quickActions.generateReport': 'रिपोर्ट उत्पन्न गर्नुहोस्',
    'quickActions.askAI': 'AI लाई सोध्नुहोस्',
    'quickActions.addUser': 'प्रयोगकर्ता थप्नुहोस्',

    // Common
    'common.allSystemsOperational': 'सबै प्रणालीहरू सञ्चालन',
    'common.viewAll': 'सबै हेर्नुहोस्',
    'common.cancel': 'रद्द गर्नुहोस्',
    'common.submit': 'पेश गर्नुहोस्',
    'common.save': 'बचत गर्नुहोस्',
    'common.delete': 'मेटाउनुहोस्',
    'common.edit': 'सम्पादन गर्नुहोस्',
    'common.close': 'बन्द गर्नुहोस्',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('cybershield_language');
    return (stored as Language) || 'en';
  });

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('cybershield_language', newLanguage);
    document.documentElement.setAttribute('lang', newLanguage);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
