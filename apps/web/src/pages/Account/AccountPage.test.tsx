import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/auth.service';
import { AccountPage } from './AccountPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  setTheme: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: mocks.setTheme }),
}));
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

const user: User = {
  id: 'user-1',
  name: 'Morgan Lee',
  email: 'morgan@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z',
  role: 'administrator',
  organization_id: 'org-1',
  organization_name: 'Northstar Security',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function renderAccount() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return queryClient;
}

describe('AccountPage organization name', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.useAuth.mockReturnValue({ user, isLoading: false });
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it('loads, edits, persists, caches, and restores the saved organization name', () => {
    const queryClient = renderAccount();
    const organizationInput = screen.getByLabelText('Organization name') as HTMLInputElement;

    expect(organizationInput).toBeDisabled();
    expect(organizationInput).toHaveValue('Northstar Security');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(organizationInput).toBeEnabled();
    fireEvent.change(organizationInput, { target: { value: '  Meridian SOC  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const persistedUser = JSON.parse(localStorage.getItem('cybershield_user') ?? '{}') as User;
    expect(persistedUser.organization_name).toBe('Meridian SOC');
    expect(queryClient.getQueryData<User>(['user'])?.organization_name).toBe('Meridian SOC');
    expect(organizationInput).toHaveValue('Meridian SOC');
    expect(organizationInput).toBeDisabled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Profile updated.');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(organizationInput, { target: { value: 'Unsaved Organization' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(organizationInput).toHaveValue('Meridian SOC');
    expect(organizationInput).toBeDisabled();
  });

  it('requires a non-empty organization name', () => {
    renderAccount();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mocks.toastError).toHaveBeenCalledWith('Organization name is required.');
    expect(localStorage.getItem('cybershield_user')).toBeNull();
    expect(screen.getByLabelText('Organization name')).toBeEnabled();
  });
});
