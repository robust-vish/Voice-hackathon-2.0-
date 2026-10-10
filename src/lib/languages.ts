import type { LanguageCode, VoiceGender } from "./types";

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  native: string;
  /** Words a seller may use to ask for this language (roman, Devanagari and native script). */
  keywords: string[];
  /** Fixed confirmation lines used when switching language (works without any API key). */
  switchConfirm: Record<VoiceGender, string>;
}

export const LANGUAGES: LanguageInfo[] = [
  {
    code: "en-IN", name: "English", native: "English",
    keywords: ["english", "angrezi", "angreji", "inglish", "अंग्रेज़ी", "अंग्रेजी", "इंग्लिश"],
    switchConfirm: { female: "Sure, I will continue in English now.", male: "Sure, I will continue in English now." },
  },
  {
    code: "hi-IN", name: "Hindi", native: "हिंदी",
    keywords: ["hindi", "हिंदी", "हिन्दी"],
    switchConfirm: { female: "जी ज़रूर, अब मैं हिंदी में बात करूँगी।", male: "जी ज़रूर, अब मैं हिंदी में बात करूँगा।" },
  },
  {
    code: "bn-IN", name: "Bengali", native: "বাংলা",
    keywords: ["bengali", "bangla", "bangali", "বাংলা", "बंगाली", "बांग्ला"],
    switchConfirm: { female: "অবশ্যই, এখন থেকে আমি বাংলায় কথা বলব।", male: "অবশ্যই, এখন থেকে আমি বাংলায় কথা বলব।" },
  },
  {
    code: "ta-IN", name: "Tamil", native: "தமிழ்",
    keywords: ["tamil", "தமிழ்", "தமிழ", "तमिल"],
    switchConfirm: { female: "சரி, இனிமேல் நான் தமிழில் பேசுகிறேன்.", male: "சரி, இனிமேல் நான் தமிழில் பேசுகிறேன்." },
  },
  {
    code: "te-IN", name: "Telugu", native: "తెలుగు",
    keywords: ["telugu", "తెలుగు", "तेलुगु", "तेलगु"],
    switchConfirm: { female: "సరే, ఇకపై నేను తెలుగులో మాట్లాడతాను.", male: "సరే, ఇకపై నేను తెలుగులో మాట్లాడతాను." },
  },
  {
    code: "gu-IN", name: "Gujarati", native: "ગુજરાતી",
    keywords: ["gujarati", "gujrati", "ગુજરાતી", "गुजराती"],
    switchConfirm: { female: "ચોક્કસ, હવે હું ગુજરાતીમાં વાત કરીશ.", male: "ચોક્કસ, હવે હું ગુજરાતીમાં વાત કરીશ." },
  },
  {
    code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ",
    keywords: ["kannada", "kannad", "ಕನ್ನಡ", "कन्नड़", "कन्नड"],
    switchConfirm: { female: "ಖಂಡಿತ, ಈಗಿನಿಂದ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.", male: "ಖಂಡಿತ, ಈಗಿನಿಂದ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ." },
  },
  {
    code: "ml-IN", name: "Malayalam", native: "മലയാളം",
    keywords: ["malayalam", "മലയാളം", "മലയാള", "मलयालम"],
    switchConfirm: { female: "തീർച്ചയായും, ഇനി ഞാൻ മലയാളത്തിൽ സംസാരിക്കാം.", male: "തീർച്ചയായും, ഇനി ഞാൻ മലയാളത്തിൽ സംസാരിക്കാം." },
  },
  {
    code: "mr-IN", name: "Marathi", native: "मराठी",
    keywords: ["marathi", "मराठी"],
    switchConfirm: { female: "नक्कीच, आता मी मराठीत बोलेन.", male: "नक्कीच, आता मी मराठीत बोलेन." },
  },
  {
    code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ",
    keywords: ["punjabi", "panjabi", "ਪੰਜਾਬੀ", "पंजाबी"],
    switchConfirm: { female: "ਜ਼ਰੂਰ, ਹੁਣ ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰਾਂਗੀ।", male: "ਜ਼ਰੂਰ, ਹੁਣ ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰਾਂਗਾ।" },
  },
  {
    code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ",
    keywords: ["odia", "oriya", "odiya", "ଓଡ଼ିଆ", "ଓଡିଆ", "ओड़िया", "उड़िया", "ओडिया"],
    switchConfirm: { female: "ନିଶ୍ଚୟ, ଏବେ ମୁଁ ଓଡ଼ିଆରେ କଥା ହେବି।", male: "ନିଶ୍ଚୟ, ଏବେ ମୁଁ ଓଡ଼ିଆରେ କଥା ହେବି।" },
  },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isLanguageCode(v: unknown): v is LanguageCode {
  return typeof v === "string" && (LANGUAGE_CODES as string[]).includes(v);
}

export function languageInfo(code: LanguageCode): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function languageName(code: string): string {
  const l = LANGUAGES.find((x) => x.code === code);
  return l ? l.name : code;
}

/**
 * Sarvam Bulbul v3 voices the agent can use, per gender, in the order they are offered when a
 * seller asks for "a different voice" (bulbul:v2 is deprecated by Sarvam). The agent introduces
 * itself by the voice's name, so "Neha" -> "Priya" is a different person to the seller.
 * The first entry is the default; override it with SARVAM_FEMALE_SPEAKER / SARVAM_MALE_SPEAKER.
 */
export const VOICE_ROSTER: Record<VoiceGender, string[]> = {
  female: ["neha", "priya", "simran", "kavya", "ritu", "shreya", "pooja"],
  male: ["rahul", "aditya", "rohan", "amit", "kabir", "varun", "shubh"],
};
/** Every speaker Bulbul v3 accepts (from the API), so env overrides can use any of them. */
const BULBUL_V3: Record<VoiceGender, string[]> = {
  female: ["ritu", "priya", "neha", "pooja", "simran", "kavya", "ishita", "shreya", "roopa", "tanya", "shruti", "suhani", "kavitha", "rupali"],
  male: ["aditya", "ashutosh", "rahul", "rohan", "amit", "dev", "ratan", "varun", "manan", "sumit", "kabir", "aayan", "shubh", "advait", "anand", "tarun", "sunny", "mani", "gokul", "vijay", "mohit", "rehan", "soham"],
};

export function isSpeakerFor(gender: VoiceGender, speaker: string | undefined | null): speaker is string {
  return !!speaker && BULBUL_V3[gender].includes(speaker);
}

/** Default speaker for a gender (env override if valid). */
export function speakerFor(_model: string, gender: VoiceGender): string {
  const env = typeof process !== "undefined" ? process.env?.[gender === "male" ? "SARVAM_MALE_SPEAKER" : "SARVAM_FEMALE_SPEAKER"]?.trim().toLowerCase() : undefined;
  return isSpeakerFor(gender, env) ? env : VOICE_ROSTER[gender][0];
}

/** The next voice of the same gender, skipping ones the seller already rejected. */
export function nextSpeaker(gender: VoiceGender, current: string, avoid: string[] = []): string {
  const roster = VOICE_ROSTER[gender];
  const start = Math.max(0, roster.indexOf(current));
  for (let k = 1; k <= roster.length; k++) {
    const s = roster[(start + k) % roster.length];
    if (s !== current && !avoid.includes(s)) return s;
  }
  return roster[(start + 1) % roster.length];
}

/** "neha" -> "Neha": the agent's name is the voice's name. */
export const agentNameFor = (speaker: string) => speaker.charAt(0).toUpperCase() + speaker.slice(1);

const SCRIPT_RANGES: [number, number, LanguageCode][] = [
  [0x0900, 0x097f, "hi-IN"], // Devanagari (Hindi / Marathi)
  [0x0980, 0x09ff, "bn-IN"],
  [0x0a00, 0x0a7f, "pa-IN"],
  [0x0a80, 0x0aff, "gu-IN"],
  [0x0b00, 0x0b7f, "od-IN"],
  [0x0b80, 0x0bff, "ta-IN"],
  [0x0c00, 0x0c7f, "te-IN"],
  [0x0c80, 0x0cff, "kn-IN"],
  [0x0d00, 0x0d7f, "ml-IN"],
];

const MARATHI_MARKERS = ["आहे", "आहेत", "नाही", "मला", "तुम्ही", "काय", "आणि", "पाहिजे", "होय"];

/** Best-effort language guess from the script a piece of text is written in. */
export function detectScriptLanguage(text: string): LanguageCode | null {
  const counts = new Map<LanguageCode, number>();
  let latin = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) latin++;
    for (const [lo, hi, code] of SCRIPT_RANGES) {
      if (cp >= lo && cp <= hi) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  let best: LanguageCode | null = null;
  let bestN = 0;
  for (const [code, n] of counts) if (n > bestN) { best = code; bestN = n; }
  if (!best || bestN < latin) return latin > 0 ? "en-IN" : best;
  if (best === "hi-IN" && MARATHI_MARKERS.some((m) => text.includes(m))) return "mr-IN";
  return best;
}

export function hasNonLatinIndicScript(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0980 && cp <= 0x0d7f) return true; // non-Devanagari Indic scripts
  }
  return false;
}
