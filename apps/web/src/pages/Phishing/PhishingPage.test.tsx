import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { scanPhishingUrl } from '../../services/api';
import { PhishingPage } from './PhishingPage';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  scanPhishingUrl: vi.fn(),
}));

const scanPhishingUrlMock = vi.mocked(scanPhishingUrl);

describe('PhishingPage', () => {
  beforeEach(() => {
    localStorage.clear();
    scanPhishingUrlMock.mockReset();
  });

  it('normalizes the URL and displays a suspicious result', async () => {
    scanPhishingUrlMock.mockResolvedValue({
      url: 'https://example.com/login',
      prediction: 'suspicious',
      phishing_probability: 0.55,
      confidence: 0.55,
      risk_level: 'high',
      signals: [{ label: 'Contains suspicious keyword', value: 1, flagged: true }],
      model: 'Test model',
    });
    render(<PhishingPage />);

    fireEvent.change(screen.getByLabelText('URL to scan'), {
      target: { value: 'example.com/login' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Scan URL' }));

    expect((await screen.findAllByText('Suspicious')).length).toBeGreaterThan(0);
    expect(scanPhishingUrlMock).toHaveBeenCalledWith('https://example.com/login');
    expect(screen.getByText('Contains suspicious keyword')).toBeInTheDocument();
  });

  it('shows the detector error message', async () => {
    scanPhishingUrlMock.mockRejectedValue(new Error('Please provide a valid URL.'));
    render(<PhishingPage />);

    fireEvent.change(screen.getByLabelText('URL to scan'), {
      target: { value: 'invalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Scan URL' }));

    expect(await screen.findByText('Please provide a valid URL.')).toBeInTheDocument();
  });
});
