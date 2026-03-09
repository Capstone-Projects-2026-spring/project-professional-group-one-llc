import { useState } from 'react';
import { Alert } from 'react-native';
import { speak, stop } from '../services/tts'; //importing the speak and stop functions from the tts service

export default function useSentenceBuilder({ onLogPress } = {}) {
  const [sentence, setSentence] = useState([]);

  const addWord = (word) => {
    onLogPress?.('word_tile', { word });

    speak(word); //providing immediate feedback by speaking the word when it's added

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
    stop(); //stopping any ongoing speech when the sentence is cleared
    console.log("Cleared the sentance");
  };

  const speakSentence = () => {
    onLogPress?.('speak_sentence', { sentenceLength: sentence.length });
    if (sentence.length === 0) return;
    speak(sentence.join(' '));
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
