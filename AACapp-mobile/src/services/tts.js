import * as Speech from "expo-speech";

export const speak = (text) => {
  if (!text || !text.trim()) return;

  Speech.stop();
  Speech.speak(text, {
    language: "en-US",
    rate: 0.9,
    pitch: 1.0,
  });
};

export const stop = () => {
  Speech.stop();
};