import { useState } from 'react';
import { Alert } from 'react-native';

export default function useSentenceBuilder() {
  const [sentence, setSentence] = useState([]);

  const addWord = (word) => {
    setSentence((prev) => {
      const nextSentence = [...prev, word];
      console.log('Current sentence:', nextSentence.join(' '));
      return nextSentence;
    });
  };

  const removeLastWord = () => {
    setSentence((prev) => prev.slice(0, -1));
  };

  const clearSentence = () => {
    setSentence([]);
  };

  const speakSentence = () => {
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
