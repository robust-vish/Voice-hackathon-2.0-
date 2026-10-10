import type { LanguageCode, VoiceGender } from "./types";

// Deterministic post-processing of everything the agent says:
//  1. First-person verb forms must match the agent's CURRENT voice gender
//     (male: "करता हूँ / करूँगा / रहा हूँ", female: "करती हूँ / करूँगी / रही हूँ").
//     Only first-person forms are touched (ending in हूँ, or the -ूँगा/-ूँगी future),
//     so lines addressed to the seller ("आप कर सकती हैं") are left alone.
//  2. The agent presents itself as IndiaMART's help assistant, never as an "AI bot".

type Rule = [RegExp, string];

const HI_TO_MALE: Rule[] = [
  [/(\S+?)ती (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "$1ता $2"],
  [/रही (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "रहा $1"],
  [/(गई|गयी) (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "गया $2"],
  [/चुकी (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "चुका $1"],
  [/(\S+?)(ूँगी|ूंगी)(?=[\s,.!?।]|$)/g, "$1ूँगा"],
  [/(\S+?)ऊँगी(?=[\s,.!?।]|$)/g, "$1ऊँगा"],
  [/समझ (गई|गयी)(?=[\s,.!?।]|$)/g, "समझ गया"],
  [/IndiaMART की ((?:virtual |seller |वर्चुअल )*(?:help assistant|हेल्प असिस्टेंट))/g, "IndiaMART का $1"],
];
const HI_TO_FEMALE: Rule[] = [
  [/(\S+?)ता (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "$1ती $2"],
  [/रहा (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "रही $1"],
  [/गया (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "गई $1"],
  [/चुका (हूँ|हूं|हू)(?=[\s,.!?।]|$)/g, "चुकी $1"],
  [/(\S+?)(ूँगा|ूंगा)(?=[\s,.!?।]|$)/g, "$1ूँगी"],
  [/(\S+?)ऊँगा(?=[\s,.!?।]|$)/g, "$1ऊँगी"],
  [/समझ गया(?=[\s,.!?।]|$)/g, "समझ गई"],
  [/IndiaMART का ((?:virtual |seller |वर्चुअल )*(?:help assistant|हेल्प असिस्टेंट))/g, "IndiaMART की $1"],
];
// Romanised Hindi (Hinglish).
const RO_TO_MALE: Rule[] = [
  [/\b(\w+?)ti (hoon|hun|hu|hoo)\b/gi, "$1ta $2"],
  [/\brahi (hoon|hun|hu|hoo)\b/gi, "raha $1"],
  [/\b(\w+?)ungi\b/gi, "$1unga"],
  [/\bsamajh gayi\b/gi, "samajh gaya"],
];
const RO_TO_FEMALE: Rule[] = [
  [/\b(\w+?)ta (hoon|hun|hu|hoo)\b/gi, "$1ti $2"],
  [/\braha (hoon|hun|hu|hoo)\b/gi, "rahi $1"],
  [/\b(\w+?)unga\b/gi, "$1ungi"],
  [/\bsamajh gaya\b/gi, "samajh gayi"],
];
// Punjabi (Gurmukhi): ਕਰਦੀ/ਕਰਦਾ ਹਾਂ, ਰਹੀ/ਰਿਹਾ ਹਾਂ, ਕਰਾਂਗੀ/ਕਰਾਂਗਾ.
const PA_TO_MALE: Rule[] = [
  [/(\S+?)ਦੀ ਹਾਂ/g, "$1ਦਾ ਹਾਂ"],
  [/ਰਹੀ ਹਾਂ/g, "ਰਿਹਾ ਹਾਂ"],
  [/(\S+?)ਾਂਗੀ(?=[\s,.!?।]|$)/g, "$1ਾਂਗਾ"],
];
const PA_TO_FEMALE: Rule[] = [
  [/(\S+?)ਦਾ ਹਾਂ/g, "$1ਦੀ ਹਾਂ"],
  [/ਰਿਹਾ ਹਾਂ/g, "ਰਹੀ ਹਾਂ"],
  [/(\S+?)ਾਂਗਾ(?=[\s,.!?।]|$)/g, "$1ਾਂਗੀ"],
];
// Marathi: मी करते (f) / मी करतो (m) — only directly after "मी".
const MR_TO_MALE: Rule[] = [[/मी (\S+?)ते(?=[\s,.!?।]|$)/g, "मी $1तो"]];
const MR_TO_FEMALE: Rule[] = [[/मी (\S+?)तो(?=[\s,.!?।]|$)/g, "मी $1ते"]];

const apply = (text: string, rules: Rule[]) => rules.reduce((t, [re, to]) => t.replace(re, to), text);

/** Makes first-person verb forms agree with the agent's voice gender. */
export function fixFirstPersonGender(text: string, lang: LanguageCode, gender: VoiceGender): string {
  const male = gender === "male";
  let t = apply(text, male ? RO_TO_MALE : RO_TO_FEMALE);
  if (lang === "hi-IN" || /[ऀ-ॿ]/.test(t)) t = apply(t, male ? HI_TO_MALE : HI_TO_FEMALE);
  if (lang === "mr-IN") t = apply(t, male ? MR_TO_MALE : MR_TO_FEMALE);
  if (lang === "pa-IN" || /[਀-੿]/.test(t)) t = apply(t, male ? PA_TO_MALE : PA_TO_FEMALE);
  return t;
}

/** Replaces "AI bot / AI assistant" self-descriptions with "help assistant". */
export function helpAssistantWording(text: string): string {
  return text
    .replace(/\b(an?\s+)?(AI|artificial intelligence)\s+(bot|assistant|agent|voice agent|model)\b/gi, (_m, art) => `${art ? "a " : ""}help assistant`)
    .replace(/\b(chat)?bot\b/gi, "help assistant")
    .replace(/(एआई|ए\.आई\.|AI)\s*(बॉट|बोट|असिस्टेंट|assistant|एजेंट|agent)/gi, "help assistant")
    .replace(/\bAI\b/g, "help assistant");
}

/** The LLM occasionally mangles the brand ("भारतMART", "इंडियामार्ट"). */
export function brandName(text: string): string {
  return text.replace(/भारत\s?MART|इंडिया\s?मार्ट|इंडियामार्ट|India\s+Mart\b|Indiamart\b|INDIAMART\b/g, "IndiaMART");
}

export function polishAgentText(text: string, lang: LanguageCode, gender: VoiceGender): string {
  return fixFirstPersonGender(helpAssistantWording(brandName(text)), lang, gender);
}
