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
  setSentence((prev) => {
    const next = prev.slice(0, -1);
    console.log('Updated sentence:', next);
    return next;
  });
};

  const clearSentence = () => {
    setSentence([]);
    console.log("Cleared the sentance");
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
