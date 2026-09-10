import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/auth.service';
import { SettingsPage } from './SettingsPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));

const user: User = {
  id: '1', name: 'Admin', email: 'admin@example.com', email_verified_at: '2026-01-01T00:00:00Z',
  role: 'administrator', organization_id: 'org-1', organization_name: 'Northstar Security',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><SettingsPage /></MemoryRouter></QueryClientProvider>);
  return client;
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.useAuth.mockReturnValue({ user });
    mocks.toastError.mockReset(); mocks.toastSuccess.mockReset();
  });

  it('renders the requested settings and masks secret values', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Company profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Email delivery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Branding' })).toBeInTheDocument();
    expect(screen.getByLabelText('TinyURL API key')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('ZeptoMail API key')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('App secret')).toHaveAttribute('type', 'password');
  });

  it('saves company identity and synchronizes the authenticated user cache', () => {
    const client = renderPage();
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Meridian SOC' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save company profile' }));
    expect(JSON.parse(localStorage.getItem('cybershield_user') ?? '{}').organization_name).toBe('Meridian SOC');
    expect(client.getQueryData<User>(['user'])?.organization_name).toBe('Meridian SOC');
  });

  it('describes connection checks honestly and resets only known logs', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('checkbox', { name: /Enable TinyURL shortening/i })[0]);
    fireEvent.change(screen.getByLabelText('TinyURL API key'), { target: { value: 'demo-key' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Test connection' })[0]);
    expect(screen.getByText(/live TinyURL connection test requires a secure backend endpoint/i)).toBeInTheDocument();

    localStorage.setItem('phishing_scan_logs', '[]');
    localStorage.setItem('incidents', 'keep');
    fireEvent.click(screen.getByRole('button', { name: 'Reset logs data' }));
    fireEvent.change(screen.getByLabelText('Confirmation'), { target: { value: 'RESET LOGS' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset logs data' })[1]);
    expect(localStorage.getItem('phishing_scan_logs')).toBeNull();
    expect(localStorage.getItem('incidents')).toBe('keep');
  });
});
