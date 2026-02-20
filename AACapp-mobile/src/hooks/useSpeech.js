import { speak, stop } from "../services/tts";

export const useSpeech = () => {
  const speakText = (text) => speak(text);
  const stopSpeech = () => stop();

  return { speakText, stopSpeech };
};