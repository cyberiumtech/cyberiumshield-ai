import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

describe('LanguageSelector', () => {
  it('renders encoding-safe language labels and country codes', () => {
    localStorage.setItem('cybershield_language', 'en');
    const { container } = render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    expect(screen.getByText('EN')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select language' }));
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Nepali')).toBeInTheDocument();
    expect(screen.getByText('NE')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[ÃÂâðà]/u);
  });
});
