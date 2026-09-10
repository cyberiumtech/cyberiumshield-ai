import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INCIDENT_STORAGE_KEY,
  addSolution,
  deriveIncidentAnalytics,
  filterIncidents,
  getIncidents,
  getStorageNotice,
  markSolutionHelpful,
  publishIncident,
  subscribeToIncidents,
} from './incident-community.service';

describe('incident community service', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('restores stable demo records when saved data is malformed', () => {
    window.localStorage.setItem(INCIDENT_STORAGE_KEY, '{broken-json');
    const incidents = getIncidents();

    expect(incidents.length).toBeGreaterThan(0);
    expect(incidents.every(incident => incident.demo)).toBe(true);
    expect(getStorageNotice()).toMatch(/unreadable/i);
    expect(() => JSON.parse(window.localStorage.getItem(INCIDENT_STORAGE_KEY) ?? '')).not.toThrow();
  });

  it('publishes an incident and notifies subscribers', () => {
    getIncidents();
    const listener = vi.fn();
    const unsubscribe = subscribeToIncidents(listener);
    const incident = publishIncident({
      title: 'Suspicious service principal consent',
      description: 'An unexpected consent grant was identified and contained.',
      author: 'Blue Team',
      severity: 'high',
      status: 'investigating',
      category: 'Cloud security',
      tags: ['oauth', 'oauth', 'consent'],
      affectedSystems: ['identity-tenant'],
    });

    expect(getIncidents().find(item => item.id === incident.id)?.tags).toEqual(['oauth', 'consent']);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('adds a solution and only marks it helpful once per browser store', () => {
    const incident = getIncidents()[0];
    const solution = addSolution(incident.id, { author: 'Response Lab', body: 'Rotate the identity and verify sign-in telemetry.' });

    expect(markSolutionHelpful(incident.id, solution.id)).toBe(true);
    expect(markSolutionHelpful(incident.id, solution.id)).toBe(false);
    const saved = getIncidents().find(item => item.id === incident.id)?.solutions.find(item => item.id === solution.id);
    expect(saved).toMatchObject({ helpfulCount: 1, helpfulByBrowser: true });
  });

  it('filters records and derives analytics from the same store', () => {
    const incidents = getIncidents();
    const phishing = filterIncidents(incidents, { query: 'invoice', severity: 'high', category: 'Phishing' });
    const analytics = deriveIncidentAnalytics(incidents);

    expect(phishing).toHaveLength(1);
    expect(analytics.total).toBe(incidents.length);
    expect(analytics.totalSolutions).toBe(incidents.flatMap(incident => incident.solutions).length);
    expect(analytics.severity.reduce((sum, entry) => sum + entry.value, 0)).toBe(incidents.length);
    expect(analytics.activity.length).toBeGreaterThan(0);
  });

  it('preserves an explicitly empty versioned store for honest empty states', () => {
    window.localStorage.setItem(INCIDENT_STORAGE_KEY, JSON.stringify({ version: 1, incidents: [] }));
    expect(getIncidents()).toEqual([]);
    expect(deriveIncidentAnalytics([]).resolutionRate).toBe(0);
  });
});
