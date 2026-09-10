import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeControls() {
  const { actualTheme, setTheme, theme } = useTheme();

  return (
    <div>
      <span>{`${theme}:${actualTheme}`}</span>
      <button type="button" onClick={() => setTheme('light')}>
        Use light
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('applies and persists the selected light theme', async () => {
    render(
      <ThemeProvider>
        <ThemeControls />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use light' }));

    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(window.localStorage.getItem('cybershield_theme')).toBe('light');
    expect(screen.getByText('light:light')).toBeInTheDocument();
  });
});
