/**
 * usePictogram.test.js
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePictogram, getPictogramUrl } from '../src/hooks/usePictogram';

// Helper to build a minimal ARASAAC-shaped API response
const makeResult = (id, keyword) => ({
  _id: id,
  keywords: [{ keyword }],
});

describe('getPictogramUrl', () => {
  test('builds the correct ARASAAC image URL', () => {
    // Verify the URL helper constructs the expected static path
    expect(getPictogramUrl(12345)).toBe(
      'https://static.arasaac.org/pictograms/12345/12345_500.png'
    );
  });
});

describe('usePictogram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns URI immediately when arasaacId is provided (no fetch)', () => {
    // Manual ID override must resolve instantly without any network call
    const { result } = renderHook(() => usePictogram('anything', 9999));

    expect(result.current.loading).toBe(false);
    expect(result.current.uri).toBe(getPictogramUrl(9999));
    expect(result.current.error).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('starts in loading state for an uncached label', () => {
    // Before the fetch resolves the hook should signal loading
    global.fetch = jest.fn(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => usePictogram('uniquelabel_loading'));

    expect(result.current.loading).toBe(true);
    expect(result.current.uri).toBeNull();
  });

  test('fetches and resolves URI for a known label', async () => {
    // Happy-path: fetch returns a valid result and the URI is resolved
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([makeResult(100, 'apple')]),
      })
    );

    const { result } = renderHook(() => usePictogram('apple_unique'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.uri).toBe(getPictogramUrl(100));
    expect(result.current.error).toBeNull();
  });

  test('uses SEARCH_ALIASES to transform the label before searching', async () => {
    // 'eat' should be looked up as 'eating' via the alias map
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([makeResult(42, 'eating')]),
      })
    );

    const { result } = renderHook(() => usePictogram('eat'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('eating');
    expect(calledUrl).not.toContain('/eat'); // raw label must not be used
  });

  test('falls back to the last word of the label if primary search fails', async () => {
    // First call (alias/primary) fails; second call (last word fallback) succeeds
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]), // empty → triggers fallback
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeResult(77, 'hands')]),
      });

    const { result } = renderHook(() => usePictogram('wash hands'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.uri).toBe(getPictogramUrl(77));
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const fallbackUrl = global.fetch.mock.calls[1][0];
    expect(fallbackUrl).toContain('hands');
  });

  test('sets error state when all fetches fail', async () => {
    // Both primary and fallback searches fail — hook must expose an error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePictogram('completely_unknown_xyz'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.uri).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(typeof result.current.error).toBe('string');
  });

  test('caches result and does not re-fetch for the same label', async () => {
    // Second render with the same label should hit the in-memory cache, not the network
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([makeResult(55, 'banana')]),
      })
    );

    // First render — populates cache
    const { result: result1 } = renderHook(() => usePictogram('banana'));
    await waitFor(() => expect(result1.current.loading).toBe(false));

    const callCountAfterFirst = global.fetch.mock.calls.length;

    // Second render — should serve from cache
    const { result: result2 } = renderHook(() => usePictogram('banana'));
    await waitFor(() => expect(result2.current.loading).toBe(false));

    expect(global.fetch.mock.calls.length).toBe(callCountAfterFirst); // no new fetch
    expect(result2.current.uri).toBe(result1.current.uri);
  });

  test('sets error when fetch returns a non-ok response', async () => {
    // HTTP error codes should result in an error state, not a crash
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve([]),
      })
    );

    const { result } = renderHook(() => usePictogram('error_label_500'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.uri).toBeNull();
    expect(result.current.error).not.toBeNull();
  });
});
