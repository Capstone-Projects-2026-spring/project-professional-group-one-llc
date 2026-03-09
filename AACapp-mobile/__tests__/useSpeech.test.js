/**
 * useSpeech.test.js
 */

import { renderHook } from '@testing-library/react-native';
import { useSpeech } from '../src/hooks/useSpeech';

// Mock the TTS service so no real audio is produced
const mockSpeak = jest.fn();
const mockStop = jest.fn();

jest.mock('../services/tts', () => ({
  speak: mockSpeak,
  stop: mockStop,
}));

describe('useSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('speakText calls speak with provided text', () => {
    // Verify that speakText delegates correctly to the underlying TTS service
    const { result } = renderHook(() => useSpeech());

    result.current.speakText('hello world');

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith('hello world');
  });

  test('stopSpeech calls stop', () => {
    // Verify that stopSpeech delegates correctly to the underlying TTS stop function
    const { result } = renderHook(() => useSpeech());

    result.current.stopSpeech();

    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  test('speakText with empty string still calls speak', () => {
    // The hook should not silently drop empty strings — filtering is the caller's responsibility
    const { result } = renderHook(() => useSpeech());

    result.current.speakText('');

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith('');
  });

  test('speakText does not call stop', () => {
    // Speaking should never inadvertently trigger stop
    const { result } = renderHook(() => useSpeech());

    result.current.speakText('test');

    expect(mockStop).not.toHaveBeenCalled();
  });

  test('stopSpeech does not call speak', () => {
    // Stopping should never inadvertently trigger speak
    const { result } = renderHook(() => useSpeech());

    result.current.stopSpeech();

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});
