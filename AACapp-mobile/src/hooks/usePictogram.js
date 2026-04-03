import { useState, useEffect } from 'react';

const ARASAAC_SEARCH = 'https://api.arasaac.org/api/pictograms/en/search';
const ARASAAC_IMG    = 'https://static.arasaac.org/pictograms';

// In-memory cache: searchTerm → image URI
const cache = {};

/**
 * SEARCH ALIASES
 * --------------
 * Maps a word label to a better search term for the ARASAAC API.
 * Use this when the label itself returns the wrong top result.
 *
 * Rules:
 *  - Keep it to ONE or TWO words — multi-word phrases often return nothing
 *  - Use the most visually distinctive word in the phrase
 *  - For "no X" / prohibition signs showing up: try a verb form instead of a noun
 */
const SEARCH_ALIASES = {
  // Actions that return prohibition signs without aliases
  'eat':        'eating',
  'drink':      'drinking',

  // Phrases — strip down to the key concept
  'i want':     'want',
  'i need':     'need',
  'all done':   'finished',
  'go home':    'home',
  'watch tv':   'television',
  'more time':  'wait',
  'wash hands': 'handwashing',
  'brush teeth':'toothbrush',
  'wake up':    'wake',
  'light on':   'lamp on',
  'light off':  'lamp off',

  // Other common labels that benefit from a cleaner search
  'privacy':    'private',
  'together':   'family',
  'i':          'myself',
  'you':        'pointing',
  'we':         'us',
  'done':       'finished',
  'go':         'walk',
  'look':       'look at',
  'fun':        'play',
  'loud':       'noise',
  'more':       'more',
  'yes':        'yes',
  'no':         'no',
  'please':     'please',
  'thank you':  'thank',
  'hello':      'greeting',
  'stop':       'stop',
  'wait':       'wait',
  'help':       'help',
  'read':       'reading',
  'write':      'writing',
  'listen':     'listening',
  'talk':       'talking',
  'relax':      'relaxing',
  'play':       'playing',
  'sit':        'sitting',
  'sleep':      'sleeping',
  'music':      'music',
  'quiet':      'quiet',
  'cook':       'cooking',
  'swing':      'swinging',
  'run':        'running',
  'walk':       'walking',
  'scared':     'fear',
  'tired':      'tired',
  'hug':        'hug',
  'snack':      'snack',
  'break':      'break',
  'question':   'question',
};

/**
 * Score an ARASAAC result against a target term.
 * Returns a higher number for better matches.
 */
function scoreBestMatch(results, targetTerm) {
  const target = targetTerm.toLowerCase();
  const targetWords = target.split(/\s+/);

  let bestId    = results[0]._id;
  let bestScore = -1;

  for (const result of results) {
    const keywords = (result.keywords || []).map((k) =>
      (k.keyword || '').toLowerCase()
    );

    let score = 0;

    for (const kw of keywords) {
      if (kw === target)                                        { score += 100; break; }
      if (targetWords.every((w) => kw.includes(w)))             score += 50;
      if (targetWords.some((w) => kw === w))                    score += 20;
      if (kw.startsWith(target))                                score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId    = result._id;
    }
  }

  return bestId;
}

/**
 * Fetch pictograms from ARASAAC for a given term.
 * Returns the parsed JSON array, or throws on failure / empty result.
 */
async function fetchPictograms(term) {
  const res = await fetch(`${ARASAAC_SEARCH}/${encodeURIComponent(term)}`);
  if (!res.ok) throw new Error(`ARASAAC ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No results for "${term}"`);
  }
  return data;
}

/**
 * Build a direct pictogram image URL from a known ARASAAC numeric ID.
 * Use this when you want to hard-code the correct pictogram for a label.
 *
 * How to find the right ID:
 *  1. Go to https://arasaac.org/pictograms/search
 *  2. Search for the word/concept you want
 *  3. Click the pictogram you like — the URL will look like:
 *       https://arasaac.org/pictograms/en/7122/light-on
 *     The number (7122) is the ID.
 *  4. You can also use the API directly in your browser:
 *       https://api.arasaac.org/api/pictograms/en/search/light%20on
 *     Each result object has an `_id` field — that's the number you need.
 *
 * Then add `arasaacId: <number>` to the suggestion object in roomContexts.js
 * or aacVocabulary.js, e.g.:
 *   { label: 'Light on',  arasaacId: 7122 }
 *   { label: 'Light off', arasaacId: 7123 }
 */
export function getPictogramUrl(id) {
  return `${ARASAAC_IMG}/${id}/${id}_500.png`;
}

/**
 * usePictogram(label, arasaacId?)
 * --------------------------------
 * Resolves a word/phrase to an ARASAAC pictogram image URI.
 * Returns { uri, loading, error }
 *
 * Resolution order:
 *  1. `arasaacId` override — if provided, skips the API entirely (instant)
 *  2. In-memory cache (instant re-use for previously fetched labels)
 *  3. SEARCH_ALIASES lookup → cleaner search term
 *  4. ARASAAC search API with best-match scoring
 *  5. Fallback: search using the last word of the label
 */
export function usePictogram(label, arasaacId) {
  const key = label.toLowerCase().trim();

  const [state, setState] = useState(() => {
    // If a manual ID is given, resolve immediately — no loading state needed
    if (arasaacId) {
      return { uri: getPictogramUrl(arasaacId), loading: false, error: null };
    }
    return cache[key]
      ? { uri: cache[key], loading: false, error: null }
      : { uri: null, loading: true, error: null };
  });

  useEffect(() => {
    // Manual override: always use the provided ID, no network call
    if (arasaacId) {
      setState({ uri: getPictogramUrl(arasaacId), loading: false, error: null });
      return;
    }

    if (cache[key]) {
      setState({ uri: cache[key], loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ uri: null, loading: true, error: null });

    const searchTerm   = SEARCH_ALIASES[key] ?? key;
    const fallbackTerm = key.split(/\s+/).pop(); // last word as last resort

    // Try primary search term, then fall back to last word if needed
    fetchPictograms(searchTerm)
      .catch(() => {
        if (searchTerm !== fallbackTerm) return fetchPictograms(fallbackTerm);
        throw new Error(`No pictogram found for "${label}"`);
      })
      .then((results) => {
        if (cancelled) return;
        const id  = scoreBestMatch(results, searchTerm);
        const uri = getPictogramUrl(id);
        cache[key] = uri;
        setState({ uri, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ uri: null, loading: false, error: err.message });
      });

    return () => { cancelled = true; };
  }, [key, arasaacId]);

  return state;
}