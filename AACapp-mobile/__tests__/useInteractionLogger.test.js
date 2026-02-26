/**
 * useInteractionLogger.test.js
 */

import { renderHook, act } from '@testing-library/react-native';
import useInteractionLogger from '../src/hooks/useInteractionLogger';

// Mock Platform so the generated device ID is deterministic across environments
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.Platform.OS = 'ios';
  rn.Platform.Version = '16';
  return rn;
});

describe('useInteractionLogger', () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('deviceId is generated in the expected format', () => {
    // Device IDs are built from Platform.OS + Platform.Version + a random suffix
    const { result } = renderHook(() => useInteractionLogger(null));

    expect(result.current.deviceId).toMatch(/^ios-16-/);
    expect(result.current.deviceId.length).toBeGreaterThan('ios-16-'.length);
  });

  test('interactionLogs starts empty', () => {
    // No interactions have occurred yet on first render
    const { result } = renderHook(() => useInteractionLogger(null));

    expect(result.current.interactionLogs).toEqual([]);
  });

  test('logButtonPress appends an entry with the correct structure', () => {
    // Each log entry must contain all required metadata fields
    const { result } = renderHook(() => useInteractionLogger(null));

    act(() => result.current.logButtonPress('speak_button'));

    expect(result.current.interactionLogs).toHaveLength(1);

    const entry = result.current.interactionLogs[0];
    expect(entry.deviceId).toBe(result.current.deviceId);
    expect(entry.buttonName).toBe('speak_button');
    expect(typeof entry.pressedAt).toBe('string');
    expect(new Date(entry.pressedAt).toISOString()).toBe(entry.pressedAt); // valid ISO 8601
    expect(entry.location).toEqual({ id: 'general', label: 'General' });
  });

  test('logButtonPress uses room location when currentRoom is provided', () => {
    // When a room is active, log entries must reflect that room's id and label
    const currentRoom = { id: 'kitchen', label: 'Kitchen' };
    const { result } = renderHook(() => useInteractionLogger(currentRoom));

    act(() => result.current.logButtonPress('word_tile'));

    const entry = result.current.interactionLogs[0];
    expect(entry.location).toEqual({ id: 'kitchen', label: 'Kitchen' });
  });

  test('logButtonPress falls back to general location when currentRoom is null', () => {
    // Without a room selected, location should default to the general fallback
    const { result } = renderHook(() => useInteractionLogger(null));

    act(() => result.current.logButtonPress('clear_button'));

    expect(result.current.interactionLogs[0].location).toEqual({
      id: 'general',
      label: 'General',
    });
  });

  test('logButtonPress merges additional metadata into the entry', () => {
    // Extra metadata (e.g. the selected word) should be spread into the top-level entry
    const { result } = renderHook(() => useInteractionLogger(null));

    act(() => result.current.logButtonPress('word_tile', { word: 'hello' }));

    expect(result.current.interactionLogs[0].word).toBe('hello');
  });

  test('logButtonPress emits entry to console.log', () => {
    // Each interaction should be printed for debugging / external log capture
    const { result } = renderHook(() => useInteractionLogger(null));

    act(() => result.current.logButtonPress('test_button'));

    expect(logSpy).toHaveBeenCalledWith(
      '[InteractionLog]',
      expect.any(String) // valid JSON string
    );

    const jsonArg = logSpy.mock.calls[0][1];
    expect(() => JSON.parse(jsonArg)).not.toThrow();
  });

  test('multiple logButtonPress calls accumulate entries in order', () => {
    // Entries must appear in the order they were recorded
    const { result } = renderHook(() => useInteractionLogger(null));

    act(() => result.current.logButtonPress('first'));
    act(() => result.current.logButtonPress('second'));
    act(() => result.current.logButtonPress('third'));

    expect(result.current.interactionLogs).toHaveLength(3);
    expect(result.current.interactionLogs[0].buttonName).toBe('first');
    expect(result.current.interactionLogs[1].buttonName).toBe('second');
    expect(result.current.interactionLogs[2].buttonName).toBe('third');
  });

  test('logButtonPress with no metadata does not crash', () => {
    // metadata defaults to {} — calling with only a button name must be safe
    const { result } = renderHook(() => useInteractionLogger(null));

    expect(() => {
      act(() => result.current.logButtonPress('safe_button'));
    }).not.toThrow();
  });
});
