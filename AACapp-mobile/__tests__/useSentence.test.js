/**
 * useSentence.test.js
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSentence } from '../src/hooks/useSentence';

// Mock the TTS service so no real audio is produced
const mockSpeak = jest.fn();
const mockStop = jest.fn();

jest.mock('../services/tts', () => ({
  speak: mockSpeak,
  stop: mockStop,
}));

describe('useSentence', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // reset all mocks before each test so previous calls don't interfere
  });

  test('initial sentence is empty', () => {
    // On first render the sentence array should be empty
    const { result } = renderHook(() => useSentence());

    expect(result.current.sentence).toEqual([]);
  });

  test('addWord appends the word to the sentence', () => {
    // Words should be appended in selection order
    const { result } = renderHook(() => useSentence());

    act(() => result.current.addWord('hello'));
    act(() => result.current.addWord('world'));

    expect(result.current.sentence).toEqual(['hello', 'world']);
  });

  test('addWord immediately speaks the word', () => {
    // Immediate spoken feedback is a core accessibility requirement
    const { result } = renderHook(() => useSentence());

    act(() => result.current.addWord('hi'));

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith('hi');
  });

  test('addWord speaks each word independently as they are added', () => {
    // Every individual word tap should produce its own speech call
    const { result } = renderHook(() => useSentence());

    act(() => result.current.addWord('I'));
    act(() => result.current.addWord('want'));
    act(() => result.current.addWord('juice'));

    expect(mockSpeak).toHaveBeenCalledTimes(3);
    expect(mockSpeak).toHaveBeenNthCalledWith(1, 'I');
    expect(mockSpeak).toHaveBeenNthCalledWith(2, 'want');
    expect(mockSpeak).toHaveBeenNthCalledWith(3, 'juice');
  });

  test('speakSentence speaks the full joined sentence', () => {
    // Words should be joined with spaces and passed as one string to the TTS service
    const { result } = renderHook(() => useSentence());

    act(() => result.current.addWord('I'));
    act(() => result.current.addWord('want'));
    act(() => result.current.addWord('food'));

    // Clear the addWord speak calls so we can isolate the speakSentence call
    mockSpeak.mockClear();

    act(() => result.current.speakSentence());

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith('I want food');
  });

  test('speakSentence on empty sentence calls speak with empty string', () => {
    // [].join(' ') === '' — the hook does not guard against this edge case
    const { result } = renderHook(() => useSentence());

    act(() => result.current.speakSentence());

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith('');
  });

  test('clear resets the sentence to empty', () => {
    // Clearing should remove all words from state
    const { result } = renderHook(() => useSentence());

    act(() => result.current.addWord('test'));
    expect(result.current.sentence).toEqual(['test']);

    act(() => result.current.clear());
    expect(result.current.sentence).toEqual([]);
  });

  test('clear calls stop to halt ongoing speech', () => {
    // TTS must be stopped when the sentence is cleared to avoid stale audio
    const { result } = renderHook(() => useSentence());

    act(() => result.current.addWord('test'));
    act(() => result.current.clear());

    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  test('clear does not call speak', () => {
    // Clearing should never produce new speech output
    const { result } = renderHook(() => useSentence());

    mockSpeak.mockClear();
    act(() => result.current.clear());

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});
