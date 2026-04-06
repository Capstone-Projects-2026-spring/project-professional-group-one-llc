const FITZGERALD_KEY_COLORS = {
  noun: '#ff9c12',
  pronoun: '#fee683',
  verb: '#9BE564',
  adjective: '#64B9F7',
  prepositionSocial: '#FF8FD8',
  question: '#A97BFF',
  negationImportant: '#FF5B5B',
  adverb: '#C8A38B',
  conjunction: '#FFFFFF',
  determiner: '#555555',
};

const PRONOUN_WORDS = new Set([
  'i',
  'me',
  'my',
  'mine',
  'you',
  'your',
  'yours',
  'we',
  'us',
  'our',
  'ours',
  'he',
  'him',
  'his',
  'she',
  'her',
  'hers',
  'it',
  'its',
  'they',
  'them',
  'their',
  'theirs',
  'this',
  'that',
  'these',
  'those',
  'here',
  'there',
]);

const VERB_WORDS = new Set([
  'want',
  'need',
  'go',
  'stop',
  'help',
  'eat',
  'drink',
  'play',
  'read',
  'walk',
  'sleep',
  'listen',
  'watch',
  'cook',
  'wash',
  'brush',
  'shower',
  'wake',
  'talk',
  'write',
  'run',
  'swing',
  'look',
  'sit',
  'hug',
  'relax',
]);

const DESCRIBING_WORDS = new Set([
  'happy',
  'sad',
  'tired',
  'hungry',
  'thirsty',
  'sick',
  'excited',
  'scared',
  'hot',
  'cold',
  'quiet',
  'loud',
  'light',
  'dark',
]);

const ADJECTIVE_WORDS = new Set([
  'big',
  'small',
  'little',
  'new',
  'old',
  'good',
  'bad',
  'fast',
  'slow',
  'long',
  'short',
  'empty',
  'full',
  'clean',
  'dirty',
]);

const ADVERB_WORDS = new Set([
  'quickly',
  'slowly',
  'quietly',
  'loudly',
  'really',
  'very',
  'too',
  'away',
  'back',
]);

const QUESTION_WORDS = new Set(['what', 'where', 'when', 'why', 'who', 'how', 'which']);

const NEGATION_IMPORTANT_WORDS = new Set([
  'no',
  'not',
  "don't",
  "can't",
  "won't",
  'never',
  'stop',
  'wait',
  'help',
  'more',
  'done',
  'all done',
]);

const CONJUNCTION_WORDS = new Set(['and', 'or', 'but', 'because', 'then']);

const DETERMINER_WORDS = new Set([
  'the',
  'a',
  'an',
  'this',
  'that',
  'these',
  'those',
  'some',
  'any',
  'my',
  'your',
  'his',
  'her',
  'our',
  'their',
]);

const NOUN_WORDS = new Set([
  'mom',
  'dad',
  'friend',
  'teacher',
  'doctor',
  'home',
  'school',
  'outside',
  'bathroom',
  'kitchen',
  'bedroom',
  'living room',
  'store',
  'park',
  'water',
  'snack',
  'blanket',
  'music',
  'toilet',
  'towel',
  'question',
  'break',
  'privacy',
  'tv',
  'light on',
  'light off',
  'room',
  'time',
]);

const PREPOSITION_SOCIAL_WORDS = new Set([
  'hello',
  'please',
  'thank you',
  'yes',
  'in',
  'on',
  'under',
  'over',
  'here',
  'there',
  'together',
  'with',
  'for',
  'from',
]);

const EXPLICIT_KEY_OVERRIDES = new Map([
  ['i want', 'verb'],
  ['i need', 'verb'],
  ['go home', 'verb'],
  ['watch tv', 'verb'],
  ['wash hands', 'verb'],
  ['brush teeth', 'verb'],
  ['wake up', 'verb'],
  ['light on', 'adjective'],
  ['light off', 'adjective'],
  ['all done', 'negationImportant'],
  ['thank you', 'prepositionSocial'],
  ['more time', 'negationImportant'],
]);

function normalizeLabel(label) {
  return String(label || '').trim().toLowerCase();
}

function getFirstMeaningfulToken(label) {
  return normalizeLabel(label).split(/\s+/).filter(Boolean)[0] || '';
}

export function getFitzgeraldKeyForWord(label) {
  const normalizedLabel = normalizeLabel(label);

  if (EXPLICIT_KEY_OVERRIDES.has(normalizedLabel)) {
    return EXPLICIT_KEY_OVERRIDES.get(normalizedLabel);
  }

  if (QUESTION_WORDS.has(normalizedLabel)) {
    return 'question';
  }

  if (NEGATION_IMPORTANT_WORDS.has(normalizedLabel)) {
    return 'negationImportant';
  }

  if (CONJUNCTION_WORDS.has(normalizedLabel)) {
    return 'conjunction';
  }

  if (DETERMINER_WORDS.has(normalizedLabel)) {
    return 'determiner';
  }

  if (PREPOSITION_SOCIAL_WORDS.has(normalizedLabel)) {
    return 'prepositionSocial';
  }

  if (PRONOUN_WORDS.has(normalizedLabel)) {
    return 'pronoun';
  }

  const firstToken = getFirstMeaningfulToken(normalizedLabel);
  if (PRONOUN_WORDS.has(firstToken)) {
    return 'pronoun';
  }

  if (VERB_WORDS.has(normalizedLabel) || normalizedLabel.split(/\s+/).some((token) => VERB_WORDS.has(token))) {
    return 'verb';
  }

  if (ADJECTIVE_WORDS.has(normalizedLabel) || normalizedLabel.split(/\s+/).some((token) => ADJECTIVE_WORDS.has(token))) {
    return 'adjective';
  }

  if (ADVERB_WORDS.has(normalizedLabel) || normalizedLabel.split(/\s+/).some((token) => ADVERB_WORDS.has(token))) {
    return 'adverb';
  }

  if (DESCRIBING_WORDS.has(normalizedLabel) || normalizedLabel.split(/\s+/).some((token) => DESCRIBING_WORDS.has(token))) {
    return 'adjective';
  }

  if (NOUN_WORDS.has(normalizedLabel) || normalizedLabel.split(/\s+/).some((token) => NOUN_WORDS.has(token))) {
    return 'noun';
  }

  return 'noun';
}

export function getFitzgeraldColorForWord(label) {
  return FITZGERALD_KEY_COLORS[getFitzgeraldKeyForWord(label)];
}

export { FITZGERALD_KEY_COLORS };