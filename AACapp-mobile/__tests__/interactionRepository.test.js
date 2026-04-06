import {
  fetchInteractionAnalytics,
  normalizeInteractionAnalytics,
} from '../src/services/interactionRepository';

const mockRpc = jest.fn();

jest.mock('../src/services/supabaseClient', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
  },
}));

describe('interactionRepository admin analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Ensures incomplete analytics payloads are normalized into a stable app-facing shape.
  test('normalizeInteractionAnalytics fills defaults for missing sections', () => {
    expect(normalizeInteractionAnalytics({ totals: { interactions: 4 } })).toEqual({
      windowHours: 168,
      generatedAt: null,
      totals: {
        interactions: 4,
        devices: 0,
        rooms: 0,
        buttons: 0,
      },
      topButtons: [],
      topRooms: [],
      recentLogs: [],
    });
  });

  // Verifies the repository calls the Supabase RPC with the admin code and returns normalized analytics.
  test('fetchInteractionAnalytics calls the RPC and returns normalized analytics', async () => {
    mockRpc.mockResolvedValue({
      data: {
        windowHours: 24,
        generatedAt: '2026-04-01T12:00:00.000Z',
        totals: {
          interactions: 12,
          devices: 3,
          rooms: 2,
          buttons: 5,
        },
        topButtons: [{ buttonName: 'speak_sentence', total: 4 }],
        topRooms: [{ roomLabel: 'Kitchen', total: 7 }],
        recentLogs: [{ id: 1, buttonName: 'clear_sentence', deviceId: 'ios-16-123' }],
      },
      error: null,
    });

    await expect(
      fetchInteractionAnalytics({
        adminAccessCode: 'secret-code',
        windowHours: 24,
        recentLimit: 10,
      }),
    ).resolves.toEqual({
      windowHours: 24,
      generatedAt: '2026-04-01T12:00:00.000Z',
      totals: {
        interactions: 12,
        devices: 3,
        rooms: 2,
        buttons: 5,
      },
      topButtons: [{ buttonName: 'speak_sentence', total: 4 }],
      topRooms: [{ roomLabel: 'Kitchen', total: 7 }],
      recentLogs: [{ id: 1, buttonName: 'clear_sentence', deviceId: 'ios-16-123' }],
    });

    expect(mockRpc).toHaveBeenCalledWith('get_interaction_analytics', {
      admin_access_code: 'secret-code',
      hours_window: 24,
      recent_limit: 10,
    });
  });

  // Confirms Supabase RPC failures are surfaced so the UI can show an admin access error.
  test('fetchInteractionAnalytics throws when the RPC returns an error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error('Invalid admin access code.'),
    });

    await expect(
      fetchInteractionAnalytics({
        adminAccessCode: 'wrong-code',
      }),
    ).rejects.toThrow('Invalid admin access code.');
  });
});
