import { useState } from 'react';
import { Alert } from 'react-native';

export default function useSentenceBuilder({ onLogPress } = {}) {
  const [sentence, setSentence] = useState([]);

  const addWord = (word) => {
    onLogPress?.('word_tile', { word });
    setSentence((prev) => {
      const nextSentence = [...prev, word];
      console.log('Current sentence:', nextSentence.join(' '));
      return nextSentence;
    });
  };

  const removeLastWord = () => {
    onLogPress?.('remove_last_word');
    setSentence((prev) => {
      const next = prev.slice(0, -1);
      console.log('Updated sentence:', next);
      return next;
    });
  };

  const clearSentence = () => {
    onLogPress?.('clear_sentence');
    setSentence([]);
    console.log("Cleared the sentance");
  };

  const speakSentence = () => {
    onLogPress?.('speak_sentence', { sentenceLength: sentence.length });
    if (sentence.length === 0) return;
    Alert.alert('Speaking', sentence.join(' '));
  };

  return {
    sentence,
    addWord,
    removeLastWord,
    clearSentence,
    speakSentence,
  };
}
