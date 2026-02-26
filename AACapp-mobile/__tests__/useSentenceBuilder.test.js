import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import useSentenceBuilder from '../src/hooks/useSentenceBuilder';

describe('useSentenceBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks(); //reset all mocks before each test so previous calls don't interfere
  });

  test('initial sentence is empty', () => {
    const { result } = renderHook(() => useSentenceBuilder()); //render the hook with no initial state
    expect(result.current.sentence).toEqual([]); //verify that the sentence starts as an empty array
  });

  test('addWord appends words in order', () => {
    const { result } = renderHook(() => useSentenceBuilder()); //render the hook

    act(() => result.current.addWord('hello')); //add words one by one
    act(() => result.current.addWord('world'));

    expect(result.current.sentence).toEqual(['hello', 'world']); //verify correcy append order
  });

  test('removeLastWord removes only the last word', () => {
    const { result } = renderHook(() => useSentenceBuilder());

    act(() => result.current.addWord('I'));
    act(() => result.current.addWord('like'));
    act(() => result.current.addWord('pizza'));

    act(() => result.current.removeLastWord());

    expect(result.current.sentence).toEqual(['I', 'like']);
  });

  test('removeLastWord on empty sentence stays empty (no crash)', () => {
    const { result } = renderHook(() => useSentenceBuilder());

    act(() => result.current.removeLastWord());

    expect(result.current.sentence).toEqual([]);
  });

  test('clearSentence resets sentence to empty', () => {
    const { result } = renderHook(() => useSentenceBuilder());

    act(() => result.current.addWord('test'));
    expect(result.current.sentence).toEqual(['test']);

    act(() => result.current.clearSentence());
    expect(result.current.sentence).toEqual([]);
  });

  test('speakSentence does nothing when sentence is empty', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {}); //mock alert.alert so it doesn't trigger UI and calls can be inspected

    const { result } = renderHook(() => useSentenceBuilder());

    act(() => result.current.speakSentence());

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('speakSentence alerts joined sentence when not empty', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSentenceBuilder());

    act(() => result.current.addWord('hello'));
    act(() => result.current.addWord('there'));
    act(() => result.current.speakSentence());

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith('Speaking', 'hello there'); //verify alert was correctly called once with corresponding sentence
  });

  test('calls onLogPress with correct event names and payloads', () => {
    const onLogPress = jest.fn();

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSentenceBuilder({ onLogPress }));

    act(() => result.current.addWord('hi'));
    expect(onLogPress).toHaveBeenCalledWith('word_tile', { word: 'hi' });

    act(() => result.current.removeLastWord());
    expect(onLogPress).toHaveBeenCalledWith('remove_last_word');

    act(() => result.current.clearSentence());
    expect(onLogPress).toHaveBeenCalledWith('clear_sentence');

    act(() => result.current.addWord('one'));
    act(() => result.current.addWord('two'));
    act(() => result.current.speakSentence());

    // last call should be speak_sentence with length 2
    expect(onLogPress).toHaveBeenCalledWith('speak_sentence', { sentenceLength: 2 });
  });

  test('does not crash if onLogPress is not provided', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useSentenceBuilder());

    expect(() => {
      act(() => result.current.addWord('safe'));
      act(() => result.current.removeLastWord());
      act(() => result.current.clearSentence());
      act(() => result.current.speakSentence());
    }).not.toThrow();
  });
});