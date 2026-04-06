import { act, renderHook } from '@testing-library/react-native';
import useAdminAnalytics from '../src/hooks/useAdminAnalytics';
import { fetchInteractionAnalytics } from '../src/services/interactionRepository';

jest.mock('../src/services/interactionRepository', () => ({
  fetchInteractionAnalytics: jest.fn(),
}));

describe('useAdminAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Prevents empty admin submissions from making a network request.
  test('loadAnalytics rejects a blank access code', async () => {
    const { result } = renderHook(() => useAdminAnalytics());

    let didUnlock;
    await act(async () => {
      didUnlock = await result.current.loadAnalytics('   ');
    });

    expect(didUnlock).toBe(false);
    expect(fetchInteractionAnalytics).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe('Enter the admin access code.');
  });

  // Confirms a valid access code loads analytics and stores session access for refreshes.
  test('loadAnalytics stores analytics on success', async () => {
    fetchInteractionAnalytics.mockResolvedValue({
      totals: { interactions: 6, devices: 2, rooms: 1, buttons: 3 },
      topButtons: [],
      topRooms: [],
      recentLogs: [],
      generatedAt: '2026-04-01T13:00:00.000Z',
      windowHours: 168,
    });

    const { result } = renderHook(() => useAdminAnalytics());

    let didUnlock;
    await act(async () => {
      didUnlock = await result.current.loadAnalytics('admin-code');
    });

    expect(didUnlock).toBe(true);
    expect(result.current.hasAdminAccess).toBe(true);
    expect(result.current.analytics?.totals.interactions).toBe(6);
    expect(result.current.errorMessage).toBe('');
    expect(fetchInteractionAnalytics).toHaveBeenCalledWith({
      adminAccessCode: 'admin-code',
      windowHours: 168,
      recentLimit: 25,
    });
  });

  // Ensures repository failures propagate into user-facing error state.
  test('loadAnalytics exposes repository errors', async () => {
    fetchInteractionAnalytics.mockRejectedValue(new Error('Invalid admin access code.'));

    const { result } = renderHook(() => useAdminAnalytics());

    let didUnlock;
    await act(async () => {
      didUnlock = await result.current.loadAnalytics('wrong-code');
    });

    expect(didUnlock).toBe(false);
    expect(result.current.analytics).toBeNull();
    expect(result.current.errorMessage).toBe('Invalid admin access code.');
  });

  // Verifies refresh uses the previously unlocked admin code instead of asking the caller again.
  test('refreshAnalytics reuses the cached admin access code', async () => {
    fetchInteractionAnalytics
      .mockResolvedValueOnce({
        totals: { interactions: 3, devices: 1, rooms: 1, buttons: 2 },
        topButtons: [],
        topRooms: [],
        recentLogs: [],
      })
      .mockResolvedValueOnce({
        totals: { interactions: 7, devices: 2, rooms: 2, buttons: 4 },
        topButtons: [],
        topRooms: [],
        recentLogs: [],
      });

    const { result } = renderHook(() => useAdminAnalytics());

    await act(async () => {
      await result.current.loadAnalytics('refresh-code');
    });

    await act(async () => {
      await result.current.refreshAnalytics({ windowHours: 24, recentLimit: 5 });
    });

    expect(fetchInteractionAnalytics).toHaveBeenNthCalledWith(2, {
      adminAccessCode: 'refresh-code',
      windowHours: 24,
      recentLimit: 5,
    });
    expect(result.current.analytics?.totals.interactions).toBe(7);
  });

  // Makes sure closing the admin session clears the in-memory code and analytics snapshot.
  test('clearAdminSession resets cached analytics state', async () => {
    fetchInteractionAnalytics.mockResolvedValue({
      totals: { interactions: 3, devices: 1, rooms: 1, buttons: 2 },
      topButtons: [],
      topRooms: [],
      recentLogs: [],
    });

    const { result } = renderHook(() => useAdminAnalytics());

    await act(async () => {
      await result.current.loadAnalytics('admin-code');
    });

    act(() => {
      result.current.clearAdminSession();
    });

    expect(result.current.hasAdminAccess).toBe(false);
    expect(result.current.analytics).toBeNull();
    expect(result.current.errorMessage).toBe('');
  });
});
