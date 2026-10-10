import type { PreferenceKey } from "./types";
import { LANGUAGE_CODES } from "./languages";

/** Allowed values per preference — used to validate manual persona edits. */
export const ALLOWED_VALUES: Record<Exclude<PreferenceKey, "bestTimeToCall">, readonly string[]> = {
  language: LANGUAGE_CODES,
  languageStyle: ["native", "code-mixed", "english-heavy"],
  voiceGender: ["female", "male"],
  tone: ["warm", "professional", "direct", "empathetic"],
  formality: ["formal", "informal"],
  pace: ["slow", "normal", "fast"],
  responseLength: ["concise", "balanced", "detailed"],
  explanationDetail: ["low", "medium", "high"],
  openingStyle: ["direct", "greeting-first", "relationship"],
  objectionHandling: ["acknowledge-and-reassure", "data-backed", "brief-and-move-on"],
};

export const PREF_ORDER: PreferenceKey[] = [
  "language", "languageStyle", "voiceGender", "tone", "formality", "pace",
  "responseLength", "explanationDetail", "openingStyle", "objectionHandling", "bestTimeToCall",
];

export const PREF_LABEL: Record<PreferenceKey, string> = {
  language: "Language",
  languageStyle: "Language style",
  voiceGender: "Agent voice",
  tone: "Tone",
  formality: "Formality",
  pace: "Conversational pace",
  responseLength: "Response length",
  explanationDetail: "Explanation detail",
  openingStyle: "Opening style",
  objectionHandling: "Objection handling",
  bestTimeToCall: "Best time to call",
};
