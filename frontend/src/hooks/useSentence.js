import { useState } from 'react';
import { speak, stop } from '../services/tts';

export const useSentence = () => {
  const [sentence, setSentence] = useState([]);

  const addWord = (word) => {
    setSentence(prev => [...prev, word]);

    //immediate feedback
    speak(word);
  };

  const speakSentence = () => {
    speak(sentence.join(' '));
  };

  const clear = () => {
    setSentence([]);
    stop();
  };

  return {
    sentence,
    addWord,
    speakSentence,
    clear,
  };
};