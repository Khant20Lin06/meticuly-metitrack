import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getStoredRole,
  setStoredRole,
  getStoredToken,
  setStoredTokens,
  clearStoredTokens,
  api,
} from '../lib/api';
import { AuthUser } from '../types';

describe('MetiTrack API Client & Auth Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('manages active operator role in local storage', () => {
    expect(getStoredRole()).toBe('ADMIN'); // Default fallback

    setStoredRole('BIOMEDICAL_ENGINEER');
    expect(getStoredRole()).toBe('BIOMEDICAL_ENGINEER');

    setStoredRole('QA_SPECIALIST');
    expect(getStoredRole()).toBe('QA_SPECIALIST');
  });

  it('manages JWT access and refresh tokens securely', () => {
    expect(getStoredToken()).toBeNull();

    const mockUser: AuthUser = {
      id: 1,
      username: 'admin',
      role: 'ADMIN',
      badge_number: 'METI-ADMIN-01',
      certification_id: 'ISO-13485-AUDITOR-2026',
    };

    setStoredTokens('mock-access-token-xyz', 'mock-refresh-token-abc', mockUser);
    expect(getStoredToken()).toBe('mock-access-token-xyz');

    clearStoredTokens();
    expect(getStoredToken()).toBeNull();
  });

  it('injects x-operator-role and Authorization headers in fetch calls', async () => {
    setStoredRole('PRODUCTION_OPERATOR');
    const mockUser: AuthUser = {
      id: 2,
      username: 'slm_tech',
      role: 'PRODUCTION_OPERATOR',
      badge_number: 'METI-SLM-12',
    };
    setStoredTokens('valid-jwt-token-123', 'refresh-token', mockUser);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, sequence_order: 1, name: '3D CAD Modeling' }],
    });
    global.fetch = mockFetch;

    const steps = await api.getSteps();
    expect(steps).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callHeaders: Headers = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders.get('x-operator-role')).toBe('PRODUCTION_OPERATOR');
    expect(callHeaders.get('authorization')).toBe('Bearer valid-jwt-token-123');
  });

  it('parses structured API validation errors on 400 Bad Request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        detail: 'Illegal station advance: Cannot skip from Step 1 to Step 3.',
      }),
    });
    global.fetch = mockFetch;

    await expect(
      api.advanceOrder(10, {
        operator_name: 'Khant Lin',
        notes: 'Trying illegal jump',
        resources: [],
      })
    ).rejects.toThrow('Illegal station advance: Cannot skip from Step 1 to Step 3.');
  });
});
