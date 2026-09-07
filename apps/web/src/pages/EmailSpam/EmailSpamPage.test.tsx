import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EmailSpamPage } from './EmailSpamPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('../../services/api', () => ({
  scanEmailSpam: vi.fn().mockResolvedValue({
    verdict: 'spam',
    score: 98,
    spam_probability: 0.98,
    confidence: 98,
    sender: 'winner@claim-prize.example',
    subject: 'URGENT: You won a cash prize',
    linkCount: 1,
    signals: [
      {
        id: 'authentication',
        label: 'Authentication failure',
        detail: 'SPF, DKIM, or DMARC reports a failure',
        detected: true,
      },
    ],
    model: 'Word + character TF-IDF Logistic Regression',
    model_version: '1.0.0',
    scannedAt: '2026-09-07T00:00:00Z',
  }),
}));

describe('EmailSpamPage', () => {
  beforeEach(() => localStorage.clear());

  it('loads and analyzes the spam sample', async () => {
    render(<EmailSpamPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Try spam sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Analyze email' }));

    expect((await screen.findAllByText('Likely spam')).length).toBeGreaterThan(0);
    expect(screen.getByText('Signal breakdown')).toBeInTheDocument();
    expect(screen.getByText('Authentication failure')).toBeInTheDocument();
  });
});
