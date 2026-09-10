import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import api from './api';
import {
  addSolution, deriveIncidentAnalytics, filterIncidents, getIncidents,
  loadIncidents, markSolutionHelpful, publishIncident, subscribeToIncidents,
  type CommunityIncident,
} from './incident-community.service';

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const apiMock = vi.mocked(api);

const stored: CommunityIncident = {
  id: 'INC-TEST-1', title: 'Signed invoice lure', description: 'A phishing incident.',
  author: 'Blue Team', severity: 'high', status: 'investigating', category: 'Phishing',
  tags: ['invoice'], affectedSystems: ['mail'], createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z', solutions: [],
};

describe('incident community MySQL service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.get.mockResolvedValue({ data: [stored] });
  });

  it('loads field notes from the API and derives analytics', async () => {
    const incidents = await loadIncidents();
    expect(incidents).toHaveLength(1);
    expect(filterIncidents(incidents, { query: 'invoice', category: 'Phishing' })).toHaveLength(1);
    expect(deriveIncidentAnalytics(incidents).total).toBe(1);
    expect(apiMock.get).toHaveBeenCalledWith('/v1/storage/incidents');
  });

  it('publishes an incident and notifies subscribers', async () => {
    await loadIncidents();
    const listener = vi.fn();
    const unsubscribe = subscribeToIncidents(listener);
    apiMock.post.mockImplementation(async (_url, body) => ({ data: body }));
    const incident = await publishIncident({ title: 'Consent grant', description: 'Contained.', author: 'SOC',
      severity: 'high', status: 'investigating', category: 'Cloud security',
      tags: ['oauth', 'oauth'], affectedSystems: ['tenant'] });
    expect(getIncidents().find(item => item.id === incident.id)?.tags).toEqual(['oauth']);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('stores solutions and helpful votes through the API', async () => {
    await loadIncidents();
    apiMock.post.mockImplementation(async (url, body) => url.endsWith('/helpful')
      ? { data: { helpfulCount: 1 } }
      : { data: body });
    const solution = await addSolution(stored.id, { author: 'Response Lab', body: 'Rotate credentials.' });
    expect(markSolutionHelpful(stored.id, solution.id)).toBe(true);
    await waitFor(() => expect(getIncidents()[0].solutions[0].helpfulCount).toBe(1));
    expect(markSolutionHelpful(stored.id, solution.id)).toBe(false);
  });
});
