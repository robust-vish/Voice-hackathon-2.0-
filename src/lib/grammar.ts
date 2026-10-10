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

// IndiaMART plan names are proper nouns: in Hindi too it's "IM Leader", never "IM नेता" / "आईएम लीडर".
const NOT_LETTER_BEFORE = String.raw`(?<![\p{L}\p{M}])`;
const NOT_LETTER_AFTER = String.raw`(?![\p{L}\p{M}])`;
const IM = String.raw`${NOT_LETTER_BEFORE}(?:IM|आई\s?एम|आईएम)\s*`;
const PRO = String.raw`(\s*(?:प्रो|pro)${NOT_LETTER_AFTER})?`;
const plan = (name: string) => (_m: string, pro?: string) => (pro ? `${name} Pro` : name);
const PLAN_RULES: [RegExp, string | ((m: string, pro?: string) => string)][] = [
  [new RegExp(String.raw`${IM}(?:इंडस्ट्री|इण्डस्ट्री|उद्योग|industry)\s*(?:लीडर|नेता|leader)${NOT_LETTER_AFTER}`, "giu"), "IM Industry Leader"],
  [new RegExp(String.raw`${IM}(?:लीडर|नेता|leader)${PRO}`, "giu"), plan("IM Leader")],
  [new RegExp(String.raw`${IM}(?:स्टार|सितारा|तारा|star)${PRO}`, "giu"), plan("IM Star")],
  [new RegExp(String.raw`${NOT_LETTER_BEFORE}(?:मैक्सिमाइज़र|मैक्सिमाइजर|मैक्सिमाइसर|मैक्सिमाइज़ेर|मैक्सीमाइज़र|मैक्सीमाइजर|maximi[sz]er)${PRO}`, "giu"), plan("Maximiser")],
  [new RegExp(String.raw`${NOT_LETTER_BEFORE}(?:ट्रस्ट\s?सील|ट्रस्ट\s?seal|trust\s?seal|विश्वास\s?(?:मुहर|सील))${NOT_LETTER_AFTER}`, "giu"), "TrustSEAL"],
];

/** The LLM / translation occasionally mangles the brand ("भारतMART", "इंडियामार्ट") or translates plan names. */
export function brandName(text: string): string {
  let t = text.replace(/भारत\s?MART|इंडिया\s?मार्ट|इंडियामार्ट|India\s+Mart\b|Indiamart\b|INDIAMART\b/g, "IndiaMART");
  for (const [re, to] of PLAN_RULES) t = t.replace(re, to as never);
  return t;
}

// ---- Acknowledgement fillers ("अच्छा", "हाँ जी") — natural once, robotic when every reply has them ----

// Only interjections followed by punctuation count ("अच्छा, ..."), so "अच्छा लगा" / "जी ज़रूर" are untouched.
const FILLER = String.raw`(?:अच्छा जी|अच्छा|हाँ जी|हां जी|हाँजी|हांजी|जी हाँ|जी हां|हाँ|हां|जी|ओके|अरे|हम्म|achha|accha|acha|haan ji|haanji|han ji|ji|okay|ok|right|oh|hmm)`;
const LEADING_FILLERS = new RegExp(String.raw`^\s*(?:${FILLER}\s*[,!।.…]+\s*)+`, "i");
const FIRST_FILLER = new RegExp(String.raw`^\s*(${FILLER})\s*([,!।.…]+)\s*`, "i");
// "… है। अच्छा, …" — an interjection that starts a later sentence.
const MID_FILLER = new RegExp(String.raw`([.!?।]\s+)(?:अच्छा|हाँ जी|हां जी|achha|accha|acha|haan ji|haanji)\s*[,!…]+\s*`, "gi");

export function startsWithFiller(text?: string | null): boolean {
  return !!text && LEADING_FILLERS.test(text);
}

/**
 * Keeps at most one leading acknowledgement, drops interjections that start later sentences, and
 * (with `dropLeading`) removes the leading one too — used when the previous reply already opened
 * with one, or a "जी…" clip was just played while the agent was thinking.
 */
export function tameFillers(text: string, { dropLeading = false } = {}): string {
  let t = text.replace(MID_FILLER, "$1");
  const lead = t.match(LEADING_FILLERS);
  if (lead) {
    const rest = t.slice(lead[0].length);
    if (rest.trim().length >= 8) {
      const first = t.match(FIRST_FILLER);
      t = dropLeading || !first ? rest : `${first[1]}${first[2].trim().charAt(0)} ${rest}`;
    }
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function polishAgentText(text: string, lang: LanguageCode, gender: VoiceGender): string {
  return fixFirstPersonGender(helpAssistantWording(brandName(text)), lang, gender);
}
