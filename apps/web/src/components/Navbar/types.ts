export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  type: 'critical' | 'threat' | 'incident' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export interface SearchResult {
  id: string;
  type: 'threat' | 'incident' | 'device' | 'user' | 'log' | 'report' | 'command';
  title: string;
  subtitle?: string;
  link: string;
}

export type AIStatus = 'online' | 'degraded' | 'offline';

export type Environment = 'production' | 'development' | 'testing';

export type Theme = 'dark' | 'light' | 'system';

export type Language = 'en' | 'ne';
