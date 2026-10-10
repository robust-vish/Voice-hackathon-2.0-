import { LANGUAGES } from "./languages";
import type { LanguageCode, Signal } from "./types";

// Deterministic, explainable detection of behavioural signals in a seller utterance.
// Works on English, romanised Hindi (Hinglish) and Devanagari, plus a few
// native-script phrases. Non-Latin utterances can additionally be translated to
// English (when Sarvam is configured) and run through the same rules.

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));
const re = (t: string, r: RegExp) => r.test(t);

const REQUEST_WORDS = [
  "talk", "speak", "say", "continue", "reply", "can you", "please", "language", "bhasha", "bhaasha",
  "baat", "bol", "boli", "bolo", "boliye", "mein", " me ", " me.", "main ", "kariye", "karo", "kijiye", "kijie", "karein", "karen",
  "में", "बात", "बोल", "करो", "करिए", "कीजिए", "कीजिये", "करें", "भाषा",
  "பேசு", "మాట్లాడ", "ಮಾತನಾಡ", "സംസാര", "বলুন", "বলো", "ਗੱਲ", "વાત", "बोला", "କଥା",
];

const ALWAYS_WORDS = ["always", "hamesha", "humesha", "हमेशा", "every time", "har baar", "हर बार", "aage se", "आगे से", "next time", "agli baar", "अगली बार"];

// STT may write English words in Devanagari ("मेल वॉइस"), so those spellings are included too.
const VOICE_WORDS = ["voice", "वॉइस", "वॉयस", "वोइस", "वायस","awaaz", "awaz", "aawaz", "aawaaz", "avaaz", "आवाज़", "आवाज", "குரல்", "గొంతు", "స్వరం", "ಧ್ವನಿ", "ശബ്ദ", "কণ্ঠ", "গলা", "ਆਵਾਜ਼", "અવાજ", "ସ୍ୱର", "speaker", "agent", "baat karo", "bole", "bolo"];
const MALE_WORDS = ["male", "मेल ", "जेंट्स","man ", "man's", "gents", "aadmi", "admi", "purush", "ladka", "ladke", "mard", "bhaiya", "boy", "पुरुष", "आदमी", "लड़के", "लड़का", "मर्द", "ஆண்", "మగ", "పురుష", "ಗಂಡು", "ಪುರುಷ", "ആണ്", "പുരുഷ", "পুরুষ", "ছেলে", "ਮਰਦ", "ਆਦਮੀ", "પુરુષ", "ପୁରୁଷ"];
const FEMALE_WORDS = ["female", "फीमेल", "फ़ीमेल", "लेडी","woman", "lady", "ladies", "aurat", "mahila", "ladki", "girl", "didi", "महिला", "औरत", "लड़की", "स्त्री", "பெண்", "ఆడ", "స్త్రీ", "ಹೆಣ್ಣು", "ಮಹಿಳ", "സ്ത്രീ", "പെണ്", "মহিলা", "মেয়ে", "ਔਰਤ", "ਜ਼ਨਾਨੀ", "સ્ત્રી", "મહિલા", "ମହିଳା"];

const SHORTER = ["short", "शॉर्ट", "शार्ट","shortly", "brief", "to the point", "point pe", "point par", "seedha", "sidha", "jaldi bataiye", "jaldi batao", "jaldi boliye", "jaldi bolo", "kam shabdon", "lamba mat", "zyada mat", "jyada mat", "quickly", "in short", "summary", "संक्षेप", "छोटा", "सीधा", "जल्दी बता", "पॉइंट", "சுருக்கமா", "క్లుప్తంగా", "ಸಂಕ್ಷಿಪ್ತ", "ചുരുക്കി", "সংক্ষেপে", "ਛੋਟੇ ਵਿੱਚ", "ટૂંકમાં", "ସଂକ୍ଷେପ", "thoda short"];
const DETAIL = ["detail", "vistar", "elaborate", "explain", "samjhao", "samjhaiye", "samjha do", "poora batao", "pura batao", "step by step", "विस्तार", "समझाइए", "समझाओ", "समझा", "डिटेल", "விவரமா", "వివరంగా", "ವಿವರವಾಗಿ", "വിശദമായി", "বিস্তারিত", "ਵਿਸਥਾਰ", "વિગતવાર", "ବିସ୍ତାର"];
const SLOWER = ["slow", "स्लो","slowly", "dheere", "dhire", "aaram se", "too fast", "bahut tez", "धीरे", "आराम से", "மெதுவா", "నెమ్మదిగా", "ನಿಧಾನ", "പതുക്കെ", "আস্তে", "ਹੌਲੀ", "ધીમે", "ଧୀରେ"];
const FASTER = ["faster", "speed up", "thoda tez", "tez boliye", "tez bolo", "jaldi jaldi", "तेज़", "तेज बोल"];
const INFORMAL = ["yaar", "bro", "boss", "casual", "tum ", "bhai "];
const FORMAL = ["be formal", "formal", "respect se", "tameez", "तमीज़"];
const BUSY = ["busy", "बिजी", "in a meeting", "meeting mein hoon", "meeting me hoon", "meeting mein hu", "मीटिंग में हूँ", "मीटिंग में हूं", "baad mein call", "baad me call", "call later", "call me later", "drive kar", "driving", "बाद में call", "बाद में कॉल", "व्यस्त", "बिज़ी"];
// "No time — tell me quickly": keep talking, but fast and straight to the point.
const HURRY = ["time nahi hai", "time nahi", "time kam hai", "time kam", "don't have time", "dont have time", "do not have time", "no time", "in a hurry", "hurry", "jaldi", "जल्दी", "टाइम नहीं", "टाइम कम", "समय नहीं", "समय कम", "quickly", "fatafat", "फटाफट"];
// Clearly off-topic subjects (the LLM also refuses anything else unrelated to IndiaMART).
const OFF_TOPIC = ["capital of", "राजधानी", "rajdhani", "weather", "mausam", "मौसम", "cricket", "क्रिकेट", "ipl", "movie", "film", "फिल्म", "song", "gaana", "गाना", "joke", "chutkula", "चुटकुला", "recipe", "politics", "election", "चुनाव", "prime minister", "pradhan mantri", "प्रधानमंत्री", "president of", "who won", "kisne jeeta", "horoscope", "rashifal", "share market", "stock market", "bitcoin", "poem", "kavita", "homework", "tell me a story", "kahani sunao"];
const ISSUE = ["issue", "problem", "dikkat", "dikat", "pareshani", "samasya", "complaint", "shikayat", "nahi aa rahe", "nahi aa rahi", "nahi aate", "not getting", "not receiving", "fake", "galat", "wrong", "irrelevant", "bekar lead", "refund", "not working", "kaam nahi", "error", "समस्या", "दिक्कत", "परेशानी", "शिकायत", "नहीं आ रहे", "नहीं आ रही", "गलत", "फ़र्ज़ी", "फर्जी"];
// ---- Seller asking for their OWN account details ("mera GLID kya hai?", "my registered number?") ----
export type ProfileField = "glid" | "mobile" | "name" | "company" | "location" | "categories" | "membership";
const PROFILE_FIELD_WORDS: Record<ProfileField, string[]> = {
  glid: ["glid", "g l i d", "gl id", "जीएलआईडी", "जी एल आई डी", "जीएल आईडी", "user id", "seller id", "account id", "यूजर आईडी"],
  mobile: ["mobile number", "mobile no", "mobile num", "phone number", "phone no", "registered number", "registered mobile", "contact number", "mera number", "mera mobile", "my number", "my mobile", "मोबाइल नंबर", "मेरा नंबर", "मेरा मोबाइल", "फोन नंबर", "फ़ोन नंबर", "रजिस्टर्ड नंबर"],
  name: ["mera naam", "my name", "मेरा नाम"],
  company: ["meri company", "my company", "company ka naam", "company name", "firm ka naam", "मेरी कंपनी", "कंपनी का नाम"],
  location: ["meri location", "my location", "mera address", "my address", "मेरा पता", "मेरी लोकेशन"],
  categories: ["meri categor", "my categor", "kaun si categor", "which categor", "konsi categor", "मेरी कैटेगरी", "कौन सी कैटेगरी"],
  membership: ["mera plan", "my plan", "meri membership", "my membership", "mera package", "मेरा प्लान", "मेरी मेंबरशिप"],
};
const PROFILE_GENERIC = ["profile details", "profile detail", "meri details", "meri detail", "my details", "account details", "account detail", "मेरी डिटेल", "प्रोफाइल डिटेल", "प्रोफ़ाइल डिटेल"];
const ASKING = ["kya", "kya hai", "what", "batao", "bataiye", "bataye", "bataen", "tell", "konsa", "kaunsa", "kaun", "which", "confirm", "?", "क्या", "बताइए", "बताओ", "बताएं", "बताइये", "कौन", "कितना"];
const NOT_MINE = ["buyer", "customer", "kharidar", "client", "बायर", "खरीदार", "ग्राहक", "उसका", "uska"];

/** Which of the seller's own profile fields they're asking about (empty if none). */
export function profileQueryFields(t: string): ProfileField[] {
  if (!has(t, ASKING) || has(t, NOT_MINE)) return [];
  const fields = (Object.keys(PROFILE_FIELD_WORDS) as ProfileField[]).filter((f) => has(t, PROFILE_FIELD_WORDS[f]));
  if (fields.length === 0 && has(t, PROFILE_GENERIC)) return ["name", "glid", "mobile", "location"];
  return fields;
}

// Seller wants it solved fast / it's still unresolved — the only times the agent escalates.
const URGENT = ["urgent", "asap", "turant", "jaldi solve", "jaldi theek", "jaldi thik", "jaldi se solve", "abhi tak solve nahi", "abhi tak theek nahi", "still not resolved", "still not solved", "not resolved yet", "kab tak", "how long", "kitni baar bola", "fix it now", "solve karo", "solve kijiye", "theek karo", "तुरंत", "जल्दी ठीक", "जल्दी solve", "अभी तक", "कब तक"];
const NO_ISSUE = ["no issue", "no issues", "no problem", "koi issue nahi", "koi problem nahi", "koi dikkat nahi", "sab theek", "sab thik", "everything is fine", "all good", "कोई दिक्कत नहीं", "कोई समस्या नहीं", "सब ठीक"];
const NEGATION = ["don't like", "dont like", "do not like", "not ", "no ", "nahi", "nahin", "pasand nahi", "mat ", "hate", "नहीं", "नही", "पसंद नहीं", "मत "];
const CLAUSE_SPLIT = /,|;|\bbut\b|\band\b|\blekin\b|\baur\b|और|लेकिन|\bcan you\b|\bplease\b|\binstead\b|\bswitch\b|\bkar do\b|\bkar dijiye\b/;
const FRUSTRATION = ["irritat", "pareshan", "baar baar", "again and again", "bekaar", "bekar", "faltu", "spam", "kitni baar", "annoying", "waste of time", "परेशान", "बार बार", "बेकार", "फालतू", "useless"];
const NOT_INTERESTED = ["not interested", "no interest", "nahi chahiye", "nahin chahiye", "interest nahi", "interested nahi", "mat karo call", "don't call", "dont call", "नहीं चाहिए", "जरूरत नहीं", "ज़रूरत नहीं"];
const END_CALL = ["bye", "बाय", "call end", "end the call", "end call", "call cut", "call band", "call khatam", "hang up", "disconnect", "कॉल एंड", "कॉल बंद", "कॉल काट", "कॉल खत्म", "फ़ोन रख","goodbye", "call end", "end the call", "rakhta hoon", "rakhti hoon", "rakhta hu", "phone rakh", "chalo theek hai bye", "alvida", "बाय", "फोन रख", "रखता हूँ", "रखती हूँ", "நன்றி வணக்கம்"];

const CALLBACK_RE = /(\d{1,2})\s*(baje|bje|बजे|pm|p\.m\.|am|a\.m\.|o'?clock)|after\s+\d{1,2}|(\d{1,2})\s*ke\s*baad|kal\s+(subah|shaam|sham|dopahar)|tomorrow|evening|shaam|sham ko|शाम|सुबह|subah|कल|चार बजे|पांच बजे|छह बजे|monday|tuesday|wednesday|thursday|friday|saturday|sunday|somvar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar|सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार/i;

const HINDI_NUMBER_WORDS: Record<string, string> = { ek: "1", do: "2", teen: "3", char: "4", chaar: "4", paanch: "5", panch: "5", chhe: "6", che: "6", saat: "7", aath: "8", nau: "9", das: "10", gyarah: "11", barah: "12" };

const WEEKDAYS: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  somvar: "Monday", mangalvar: "Tuesday", budhvar: "Wednesday", guruvar: "Thursday", shukravar: "Friday", shanivar: "Saturday", ravivar: "Sunday",
  "सोमवार": "Monday", "मंगलवार": "Tuesday", "बुधवार": "Wednesday", "गुरुवार": "Thursday", "शुक्रवार": "Friday", "शनिवार": "Saturday", "रविवार": "Sunday",
};

/**
 * Which voice the seller wants. Handles negation per clause:
 * "I don't like the male voice, switch to female" -> female; "female voice pasand nahi" -> male.
 */
function requestedGender(t: string): { value: "male" | "female"; negated: boolean } | null {
  const scrub = (s: string) => s.replace(/female|woman|फ़?ीमेल|फ़ीमेल|फीमेल/g, "######");
  let want: "male" | "female" | null = null;
  let negated: "male" | "female" | null = null;
  for (const clause of t.split(CLAUSE_SPLIT)) {
    const m = has(scrub(clause), MALE_WORDS);
    const f = has(clause, FEMALE_WORDS);
    if (!m && !f) continue;
    const g: "male" | "female" = m && !f ? "male" : f && !m ? "female" : scrub(clause).lastIndexOf("male") > clause.lastIndexOf("female") ? "male" : "female";
    if (has(` ${clause} `, NEGATION)) negated = g;
    else want = g;
  }
  if (want) return { value: want, negated: !!negated && negated !== want };
  if (negated) return { value: negated === "male" ? "female" : "male", negated: true };
  return null;
}

// ---- Language mirroring helpers (Latin-script utterances) ----
const EN_WORDS = new Set(["the", "is", "are", "am", "i", "you", "we", "they", "my", "your", "what", "how", "why", "when", "where", "can", "could", "would", "please", "of", "and", "not", "don't", "do", "does", "have", "has", "this", "that", "it", "with", "for", "about", "want", "need", "like", "will", "should", "there", "any", "much", "many", "getting", "tell", "me", "if", "but", "so", "yes", "no", "okay"]);
const HINGLISH_WORDS = new Set(["hai", "hain", "nahi", "nahin", "kya", "mein", "ka", "ki", "ke", "ko", "ji", "haan", "aap", "aapka", "aapki", "karo", "kijiye", "boliye", "bataiye", "batao", "theek", "thik", "acha", "accha", "achha", "bhai", "yaar", "kal", "abhi", "mujhe", "hum", "raha", "rahi", "rahe", "tha", "thi", "kar", "se", "bhi", "toh", "lekin", "aur", "kuch", "koi", "baat", "chahiye", "wala", "wale", "hoon", "hu", "baje", "kitna", "kaise", "kyun"]);

/** True for a full English sentence (not Hinglish). */
export function looksEnglish(text: string): boolean {
  if (/[ऀ-ൿ]/.test(text)) return false;
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 3) return false;
  const hing = words.filter((w) => HINGLISH_WORDS.has(w)).length;
  const en = words.filter((w) => EN_WORDS.has(w)).length;
  return hing / words.length < 0.12 && en >= Math.max(1, Math.round(words.length * 0.2));
}

/** True for romanised Hindi ("haan ji, meeting ke liye kal free hoon"). */
export function looksHinglish(text: string): boolean {
  if (/[ऀ-ൿ]/.test(text)) return false;
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 2) return false;
  return words.filter((w) => HINGLISH_WORDS.has(w)).length / words.length >= 0.25;
}

function extractCallbackTime(original: string, t: string): string | null {
  const m = original.match(/(\d{1,2})\s*(baje|bje|बजे|pm|p\.m\.|am|a\.m\.)/i);
  const afterM = t.match(/after\s+(\d{1,2})\s*(pm|am)?|(\d{1,2})\s*(?:baje\s*)?ke\s*baad/);
  const words = t.match(/\b(ek|do|teen|chaar|char|paanch|panch|chhe|che|saat|aath|nau|das|gyarah|barah)\s+baje/);
  const part = t.includes("shaam") || t.includes("sham") || t.includes("evening") || original.includes("शाम") ? "evening" : t.includes("subah") || t.includes("morning") || original.includes("सुबह") ? "morning" : "";
  const weekday = Object.entries(WEEKDAYS).find(([k]) => t.includes(k) || original.includes(k))?.[1];
  const day = weekday ?? (/\bkal\b|tomorrow/.test(t) || original.includes("कल") ? "tomorrow" : /\baaj\b|today/.test(t) || original.includes("आज") ? "today" : "");
  let time = "";
  if (afterM) time = `after ${afterM[1] ?? afterM[3]}${afterM[2] ? ` ${afterM[2].toUpperCase()}` : ""}`;
  else if (m) time = `${m[1]} ${/pm|p\.m/i.test(m[2]) ? "PM" : /am|a\.m/i.test(m[2]) ? "AM" : "o'clock"}`;
  else if (words) time = `${HINDI_NUMBER_WORDS[words[1]]} o'clock`;
  if (time && /ke\s*baad|के बाद|after/.test(t + original) && !time.startsWith("after")) time = `after ${time}`;
  const s = [day, part, time].filter(Boolean).join(" ").trim();
  return s || null;
}

/** Language explicitly requested in the utterance, if any. */
export function requestedLanguage(text: string): LanguageCode | null {
  const t = ` ${text.toLowerCase()} `;
  const hits = LANGUAGES.filter((l) => l.keywords.some((k) => t.includes(k.toLowerCase())));
  if (hits.length === 0) return null;
  const words = t.trim().split(/\s+/).length;
  const looksLikeRequest = has(t, REQUEST_WORDS) || words <= 3;
  if (!looksLikeRequest) return null;
  // If several languages are named ("not Hindi, Tamil please"), prefer the last-mentioned one.
  let best: LanguageCode | null = null;
  let bestIdx = -1;
  for (const l of hits) {
    for (const k of l.keywords) {
      const idx = t.lastIndexOf(k.toLowerCase());
      if (idx > bestIdx) { bestIdx = idx; best = l.code; }
    }
  }
  return best;
}

export function detectSignals(text: string, currentLanguage: LanguageCode): Signal[] {
  const original = text;
  const t = ` ${text.toLowerCase().replace(/[.,!?।]/g, " ")} `;
  const out: Signal[] = [];
  const always = has(t, ALWAYS_WORDS);
  const quote = original.trim();

  const lang = requestedLanguage(original);
  if (lang && lang !== currentLanguage) {
    out.push({ type: "language_switch", label: `Seller asked to talk in ${LANGUAGES.find((l) => l.code === lang)!.name}`, quote, value: lang, explicit: true, persistentCandidate: true, confidence: 0.9 });
  }

  const voiceCtx = has(t, VOICE_WORDS) || has(t, ["change", "badlo", "badal", "बदल", "switch"]);
  const gender = requestedGender(t);
  if (gender && (voiceCtx || t.trim().split(/\s+/).length <= 4)) {
    out.push({ type: "voice_gender", label: `Seller asked for a ${gender.value} voice${gender.negated ? ` (doesn't like the ${gender.value === "male" ? "female" : "male"} voice)` : ""}`, quote, value: gender.value, explicit: true, persistentCandidate: true, confidence: 0.9 });
  }

  if (has(t, SHORTER)) out.push({ type: "shorter", label: "Seller asked for shorter, to-the-point answers", quote, value: "concise", explicit: true, persistentCandidate: true, confidence: 0.85 });
  else if (has(t, DETAIL)) out.push({ type: "more_detail", label: "Seller asked for a more detailed explanation", quote, value: "detailed", explicit: true, persistentCandidate: true, confidence: 0.8 });

  if (has(t, HURRY)) out.push({ type: "hurry", label: "Seller has little time — speak faster and get to the point", quote, value: "fast", explicit: true, persistentCandidate: false, confidence: 0.85 });

  if (has(t, OFF_TOPIC)) out.push({ type: "off_topic", label: "Seller asked something unrelated to IndiaMART", quote, explicit: true, persistentCandidate: false, confidence: 0.8 });

  const profileFields = profileQueryFields(t);
  if (profileFields.length) out.push({ type: "profile_query", label: `Seller asked for their own profile details (${profileFields.join(", ")})`, quote, value: profileFields.join(","), explicit: true, persistentCandidate: false, confidence: 0.85 });

  if (has(t, URGENT)) out.push({ type: "urgent", label: "Seller wants the problem fixed quickly", quote, explicit: true, persistentCandidate: false, confidence: 0.8 });

  if (has(t, ISSUE) && !has(t, NO_ISSUE)) out.push({ type: "issue", label: "Seller reported an issue with IndiaMART", quote, value: quote, explicit: true, persistentCandidate: false, confidence: 0.75 });

  if (has(t, SLOWER)) out.push({ type: "slower", label: "Seller asked the agent to speak slower", quote, value: "slow", explicit: true, persistentCandidate: true, confidence: 0.85 });
  else if (has(t, FASTER)) out.push({ type: "faster", label: "Seller asked the agent to speak faster", quote, value: "fast", explicit: true, persistentCandidate: true, confidence: 0.75 });

  if (has(t, FORMAL) && !t.includes("informal")) out.push({ type: "formal", label: "Seller expects a formal tone", quote, value: "formal", explicit: true, persistentCandidate: true, confidence: 0.7 });
  else if (has(t, INFORMAL)) out.push({ type: "informal", label: "Seller is speaking casually", quote, value: "informal", explicit: false, persistentCandidate: true, confidence: 0.5 });

  if (has(t, NOT_INTERESTED)) out.push({ type: "not_interested", label: "Seller is not interested right now", quote, explicit: true, persistentCandidate: false, confidence: 0.85 });
  if (has(t, FRUSTRATION)) out.push({ type: "frustration", label: "Seller sounds frustrated", quote, value: "empathetic", explicit: false, persistentCandidate: false, confidence: 0.7 });

  const busy = has(t, BUSY);
  if (busy) out.push({ type: "busy", label: "Seller is busy right now", quote, explicit: true, persistentCandidate: false, confidence: 0.8 });
  if (re(original, CALLBACK_RE) || re(t, CALLBACK_RE)) {
    const when = extractCallbackTime(original, t);
    if (when && (busy || /call|phone|baat|बात|kariye|karo|kijiye|baad|after|available|meeting|मीटिंग|free|फ्री|milte|milna|मिल|theek rahega|chalega|slot/.test(t + original))) {
      out.push({ type: "callback_time", label: `Seller prefers calls ${when}`, quote, value: when, explicit: true, persistentCandidate: true, confidence: 0.8 });
    }
  }

  if (has(t, END_CALL)) out.push({ type: "end_call", label: "Seller is ending the call", quote, explicit: true, persistentCandidate: false, confidence: 0.8 });

  if (always) for (const s of out) if (s.persistentCandidate) { s.confidence = Math.max(s.confidence, 0.95); s.label += " (said this should always apply)"; }
  return out;
}

export function saysAlways(text: string): boolean {
  return has(` ${text.toLowerCase()} `, ALWAYS_WORDS);
}

/** Simple fact extraction: statements with prices, quantities, timings or catalog products. */
export function extractFacts(text: string, catalogNames: string[]): { category: "pricing" | "product" | "availability" | "business"; fact: string }[] {
  const t = text.toLowerCase();
  const facts: { category: "pricing" | "product" | "availability" | "business"; fact: string }[] = [];
  const product = catalogNames.find((n) => {
    const words = n.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return words.filter((w) => t.includes(w)).length >= Math.min(2, words.length);
  });
  const price = text.match(/(₹|\brs\.?|\binr|\brupees?|\brupaye|\brupay|रुपये|रुपए)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(₹|rs\b\.?|rupees?\b|rupaye\b|rupay\b|रुपये|रुपए|\/-)/i);
  if (price) {
    const amount = (price[2] ?? price[3]).replace(/,/g, "");
    const per = text.match(/(per|प्रति|\/)\s*(kg|piece|pc|set|meter|metre|ton|unit|किलो|पीस)|(kilo|किलो)\s*(ka|ke|का|के)?/i);
    facts.push({ category: "pricing", fact: `${product ? `${product}: ` : ""}seller quoted ₹${amount}${per ? ` per ${(per[2] ?? per[3] ?? "unit").replace("किलो", "kg").replace("kilo", "kg")}` : ""}` });
  } else if (product && /\d/.test(t)) {
    facts.push({ category: "product", fact: `${product}: ${text.trim()}` });
  }
  if (/moq|minimum order|kam se kam/.test(t)) facts.push({ category: "business", fact: `MOQ mentioned: ${text.trim()}` });
  if (/delivery|dispatch|stock|available|uplabdh|उपलब्ध|स्टॉक/.test(t)) facts.push({ category: "availability", fact: text.trim() });
  if (/closed|band rehta|band hai|holiday|chhutti|छुट्टी|बंद/.test(t)) facts.push({ category: "availability", fact: text.trim() });
  if (/export|dealer|distributor|wholesale|retail|factory|manufactur/.test(t) && !facts.length) facts.push({ category: "business", fact: text.trim() });
  return facts;
}
