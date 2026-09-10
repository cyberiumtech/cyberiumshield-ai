import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/auth.service';
import { ProfileDropdown } from './ProfileDropdown';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));

const user: User = {
  id: 'user-1',
  name: 'Morgan Lee',
  email: 'morgan@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z',
  role: 'administrator',
  organization_id: 'org-1',
  organization_name: 'Northstar Security',
  avatar: 'data:image/png;base64,avatar',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current location">{`${location.pathname}${location.hash}`}</output>;
}

describe('ProfileDropdown', () => {
  beforeEach(() => {
    mocks.logout.mockReset();
    mocks.useAuth.mockReturnValue({ user, logout: mocks.logout });
  });

  it('shows the simplified menu and navigates Appearance to its profile anchor', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProfileDropdown />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Morgan Lee/i }));

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    expect(screen.queryByText('Organization settings')).not.toBeInTheDocument();
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument();
    expect(screen.queryByText('Security')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));

    expect(screen.getByLabelText('Current location')).toHaveTextContent('/profile#appearance');
  });
});
