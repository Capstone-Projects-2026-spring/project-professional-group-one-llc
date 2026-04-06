import { FITZGERALD_KEY_COLORS, getFitzgeraldColorForWord, getFitzgeraldKeyForWord } from '../src/utils/fitzgeraldKey';

describe('fitzgeraldKey', () => {
  test('maps pronouns to the pronoun color', () => {
    expect(getFitzgeraldKeyForWord('I')).toBe('pronoun');
    expect(getFitzgeraldColorForWord('you')).toBe(FITZGERALD_KEY_COLORS.pronoun);
  });

  test('maps action words to the verb color', () => {
    expect(getFitzgeraldKeyForWord('Go home')).toBe('verb');
    expect(getFitzgeraldColorForWord('wash hands')).toBe(FITZGERALD_KEY_COLORS.verb);
  });

  test('maps adjectives to the adjective color', () => {
    expect(getFitzgeraldKeyForWord('Hungry')).toBe('adjective');
    expect(getFitzgeraldColorForWord('cold')).toBe(FITZGERALD_KEY_COLORS.adjective);
  });

  test('maps questions, conjunctions, and determiners to their colors', () => {
    expect(getFitzgeraldKeyForWord('What')).toBe('question');
    expect(getFitzgeraldKeyForWord('and')).toBe('conjunction');
    expect(getFitzgeraldKeyForWord('the')).toBe('determiner');
  });

  test('defaults unknown words to noun color', () => {
    expect(getFitzgeraldKeyForWord('pencil')).toBe('noun');
    expect(getFitzgeraldColorForWord('pencil')).toBe(FITZGERALD_KEY_COLORS.noun);
  });
});