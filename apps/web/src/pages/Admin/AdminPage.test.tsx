import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/auth.service';
import { ADMIN_STORAGE_KEY, adminRepository } from '../../services/admin.service';
import { AdminPage } from './AdminPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

const user: User = {
  id: '1',
  name: 'Demo Administrator',
  email: 'admin@cybershield.ai',
  email_verified_at: '2026-01-01T00:00:00Z',
  role: 'administrator',
  organization_id: 'org-1',
  organization_name: 'Northstar Security',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminPage />
    </MemoryRouter>
  );
}

describe('AdminPage', () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    mocks.useAuth.mockReturnValue({ user });
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:admin-export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('renders identity perimeter metrics from repository state', () => {
    const state = adminRepository.getState();
    const activeCount = state.users.filter(item => item.status === 'active').length;

    renderPage();

    expect(screen.getByRole('heading', { name: 'Identity Control Plane' })).toBeInTheDocument();
    expect(screen.getByText('Northstar Security')).toBeInTheDocument();

    const perimeter = screen.getByRole('heading', { name: 'Identity perimeter' }).closest('section');
    expect(perimeter).not.toBeNull();
    expect(within(perimeter!).getByText(/Active identities/)).toBeInTheDocument();
    expect(within(perimeter!).getByText(String(activeCount))).toBeInTheDocument();
    expect(within(perimeter!).getByText(/Privileged admins/)).toBeInTheDocument();
    expect(within(perimeter!).getByText(/Unresolved invites/)).toBeInTheDocument();
    expect(within(perimeter!).getByText(/Suspended identities/)).toBeInTheDocument();
    expect(within(perimeter!).getByText(/Permission coverage/)).toBeInTheDocument();
  });

  it('creates a user through the modal and records the mutation', async () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Add user' })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Maya Incident Lead' },
    });
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'maya@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'security-analyst' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));

    await waitFor(() => {
      const state = adminRepository.getState();
      expect(state.users).toContainEqual(
        expect.objectContaining({
          name: 'Maya Incident Lead',
          email: 'maya@example.com',
          roleId: 'security-analyst',
          status: 'invited',
        })
      );
      expect(state.audit[0]).toMatchObject({
        action: 'user.created',
        target: 'Maya Incident Lead',
      });
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith('User invitation created.');
  });

  it('exports users and audit events and records both exports', async () => {
    renderPage('/admin/users');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(adminRepository.getState().audit[0].action).toBe('users.exported');
    });

    fireEvent.click(screen.getByRole('link', { name: /Audit activity/ }));
    expect(await screen.findByRole('heading', { name: 'Audit activity' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export ledger' }));

    await waitFor(() => {
      const actions = adminRepository.getState().audit.map(entry => entry.action);
      expect(actions).toEqual(expect.arrayContaining(['users.exported', 'audit.exported']));
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
