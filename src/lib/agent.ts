import { detectScriptLanguage, languageInfo, languageName } from "./languages";
import { isPaidMember, missingPriceProducts } from "./persona";
import { tenure } from "./profile";
import { sarvamChat, sarvamConfigured, sarvamTranslate, type ChatMessage } from "./sarvam";
import { knowledgePrompt, quickTip } from "./knowledge";
import { extractFacts } from "./signals";
import { CALL_STAGES, type AgentReply, type CallStage, type Interaction, type LanguageCode, type Pace, type ResponseLength, type SellerProfile, type Signal, type VoiceGender } from "./types";

// Call script (template "beats"):
//   0 identity  "Am I speaking with <name> of <company>?"
//   1 feedback  "You've been on IndiaMART for X — how is it going, any issues?"
//   2 resolve   resolve/escalate (or "great to hear") + ask for a meeting slot
//   3 pitch     confirm meeting + paid-subscription benefits
//   4 catalog   missing price (if any)
//   5 open      "anything else?" — until the SELLER ends the call
export const BEAT_STAGE: CallStage[] = ["identity", "feedback", "meeting", "pitch", "catalog", "open"];
export const LAST_BEAT = 5;
export const stageIndex = (s: CallStage) => CALL_STAGES.indexOf(s);

// Bulbul v3 pace (0.5–2.0). Slightly brisker than 1.0 sounds like a natural phone conversation.
export const PACE_TO_TTS: Record<Pace, number> = { slow: 0.95, normal: 1.15, fast: 1.35 };

interface Ctx {
  name?: string; // first name, if known
  company?: string; // company, if known
  cats?: string; // top BuyLead categories / what they deal in (for natural mentions)
  catalogEmpty: boolean;
  dealsIn?: string;
  agent: string;
  g: VoiceGender;
  len: ResponseLength;
  product?: string;
  unit: string;
  missing: number;
  category: string;
  callback?: string;
  meeting?: string;
  tenureEn: string;
  tenureHi: string;
  paid: boolean;
  membership?: string;
  openIssue?: string;
  turn: number;
}

const hiG = (g: VoiceGender, f: string, m: string) => (g === "female" ? f : m);

type Lines = { en: (c: Ctx) => string; hi: (c: Ctx) => string };

const by = (len: ResponseLength, concise: string, balanced: string, detailed: string) => (len === "concise" ? concise : len === "detailed" ? detailed : balanced);
const pick = <T,>(arr: T[], n: number) => arr[n % arr.length];

const IDENTITY: Lines = {
  en: (c) => c.name ? `Hello! Am I speaking with ${c.name} ji${c.company ? ` from ${c.company}` : ""}?` : `Hello! Am I speaking with the owner of this IndiaMART account${c.company ? `, ${c.company}` : ""}?`,
  hi: (c) => c.name ? `नमस्ते! क्या मेरी बात ${c.name} जी से हो रही है${c.company ? `, ${c.company} से` : ""}?` : `नमस्ते! क्या मेरी बात इस IndiaMART account के owner से हो रही है${c.company ? `, ${c.company} से` : ""}?`,
};

const FEEDBACK: Lines = {
  en: (c) => c.openIssue
    ? `Thank you${c.name ? `, ${c.name} ji` : ""}! I'm ${c.agent} from IndiaMART. Last time you mentioned "${c.openIssue}" — has that been sorted out, or are you still facing it?`
    : by(c.len,
      `Thanks! ${c.agent} from IndiaMART. You've been with us ${c.tenureEn} — any issues lately?`,
      `Thank you${c.name ? `, ${c.name} ji` : ""}! I'm ${c.agent} from IndiaMART. You've been using IndiaMART for ${c.tenureEn} now${c.cats ? `, taking BuyLeads for ${c.cats}` : ""} — how has your experience been? Are you facing any issues?`,
      `Thank you so much${c.name ? `, ${c.name} ji` : ""}! I'm ${c.agent} from IndiaMART. You've been with IndiaMART for ${c.tenureEn} now${c.cats ? `, taking BuyLeads for ${c.cats}` : ""}, and we'd really like your honest feedback — how has the experience been, and is anything troubling you, like leads, enquiries or your listings?`),
  hi: (c) => c.openIssue
    ? `जी धन्यवाद! मैं ${c.agent}, IndiaMART से। पिछली बार आपने "${c.openIssue}" के बारे में बताया था — क्या वो solve हो गया, या अभी भी दिक्कत आ रही है?`
    : by(c.len,
      `जी धन्यवाद! मैं ${c.agent}, IndiaMART से। ${c.tenureHi} से आप हमारे साथ हैं — कोई दिक्कत?`,
      `जी धन्यवाद! मैं ${c.agent} बोल ${hiG(c.g, "रही", "रहा")} हूँ, IndiaMART से। आप पिछले ${c.tenureHi} से IndiaMART use कर रहे हैं${c.cats ? `, ${c.cats} के BuyLeads ले रहे हैं` : ""} — आपका experience कैसा रहा? कोई दिक्कत तो नहीं आ रही?`,
      `जी बहुत धन्यवाद! मैं ${c.agent} बोल ${hiG(c.g, "रही", "रहा")} हूँ, IndiaMART से। आप पिछले ${c.tenureHi} से IndiaMART के साथ हैं${c.cats ? ` और ${c.cats} के BuyLeads ले रहे हैं` : ""}, तो हम आपका honest feedback जानना चाहते हैं — experience कैसा रहा? Leads, enquiries या listing में कोई परेशानी तो नहीं?`),
};

const ESCALATE: Lines = {
  en: () => `I'm really sorry you're facing this — we truly apologise. I'm escalating it to our senior team right away so it gets resolved as soon as possible.`,
  hi: (c) => `इस परेशानी के लिए हमें सच में बहुत खेद है। मैं इसे अभी अपनी senior team को escalate कर ${hiG(c.g, "रही", "रहा")} हूँ, ताकि जल्द से जल्द solve हो जाए।`,
};
/** App guidance for a reported issue (template path). Falls back to "noted, I'll check". */
function tipLines(issue: string): Lines {
  const t = quickTip(issue);
  if (t) return { en: () => `I understand. ${t.en}`, hi: (c) => `समझ ${hiG(c.g, "सकती", "सकता")} हूँ। ${t.hi}` };
  return { en: () => "I've noted this down, and I'll check it and get back to you.", hi: (c) => `मैंने ये note कर लिया है, check करके आपको ${hiG(c.g, "बताती", "बताता")} हूँ।` };
}

const GLAD: Lines = {
  en: () => `That's really good to hear!`,
  hi: () => `ये सुनकर बहुत अच्छा लगा!`,
};
const MEETING_ASK: Lines = {
  en: (c) => by(c.len, `Could we set up a short meeting? When are you free?`, `Could you spare a little time for a short meeting with our team? When would you be free?`, `We'd love to sit with you for a short meeting to understand your business better and help you grow on IndiaMART. Could you spare some time — when would you be free?`),
  hi: (c) => by(c.len, `एक छोटी meeting रख लें? आप कब free हैं?`, `क्या आप हमारी team के साथ एक छोटी सी meeting के लिए थोड़ा समय निकाल सकते हैं? आप कब free रहेंगे?`, `हम आपके business को और अच्छे से समझकर IndiaMART पर grow करने में मदद करना चाहते हैं। क्या एक छोटी सी meeting के लिए थोड़ा समय निकाल सकते हैं? आप कब free रहेंगे?`),
};
const MEETING_OK: Lines = {
  en: (c) => (c.meeting ? `Perfect, I've noted ${c.meeting} for the meeting.` : `No problem at all.`),
  hi: (c) => (c.meeting ? `बढ़िया, meeting के लिए ${c.meeting} note कर ${hiG(c.g, "लिया", "लिया")}।` : `कोई बात नहीं।`),
};
const PITCH: Lines = {
  en: (c) => c.paid
    ? by(c.len, `Upgrading your ${c.membership} plan gets you more BuyLeads and top visibility. Interested?`, `And since you're on ${c.membership}, an upgrade would bring you even more BuyLeads and top visibility in search results. Would you like to hear more about it?`, `And since you're already on ${c.membership}, upgrading would bring you even more BuyLeads every week to expand your business, top placement in search results, and dedicated account support. Would you like to hear more about it?`)
    : by(c.len, `With a paid plan you get many more BuyLeads to grow your business. Interested?`, `By the way, with a paid IndiaMART subscription you get many more BuyLeads${c.cats ? ` in ${c.cats}` : ""}, which you can use to really expand your business — plus better visibility in search and a verified TrustSEAL badge buyers trust. Would you like to know more?`, `By the way, with a paid IndiaMART subscription you get many more BuyLeads every week that you can use to expand your business, much better visibility when buyers search, a verified TrustSEAL badge that builds buyer trust, and dedicated support. Would you like to know more?`),
  hi: (c) => c.paid
    ? by(c.len, `${c.membership} upgrade करने पर और ज़्यादा BuyLeads और top visibility मिलेगी। जानना चाहेंगे?`, `और आप ${c.membership} पर हैं, तो upgrade करने से आपको और भी ज़्यादा BuyLeads और search में top visibility मिलेगी। इसके बारे में बताऊँ?`, `और आप पहले से ${c.membership} पर हैं, तो upgrade करने से हर हफ्ते और ज़्यादा BuyLeads, search में top position और dedicated support मिलेगा — जिससे business बढ़ाना आसान होगा। इसके बारे में detail में बताऊँ?`)
    : by(c.len, `Paid plan में बहुत ज़्यादा BuyLeads मिलते हैं, business बढ़ाने के लिए। जानना चाहेंगे?`, `और एक बात — IndiaMART के paid subscription में आपको ${c.cats ? `${c.cats} के ` : ""}बहुत ज़्यादा BuyLeads मिलते हैं, जिनसे आप अपना business अच्छे से बढ़ा सकते हैं। साथ में search में बेहतर visibility और verified TrustSEAL badge भी। जानना चाहेंगे?`, `और एक बात — IndiaMART के paid subscription में आपको हर हफ्ते बहुत ज़्यादा BuyLeads मिलते हैं, जिनसे business expand कर सकते हैं; buyers के search में आपकी listing ऊपर आती है, verified TrustSEAL badge से buyers का भरोसा बढ़ता है, और dedicated support भी मिलता है। जानना चाहेंगे?`),
};
const CATALOG: Lines = {
  en: (c) => (c.missing && c.product ? `One quick thing — ${c.product} doesn't have a price on your listing yet. What's your rate per ${c.unit}?` : c.catalogEmpty ? `Which main products would you like listed on IndiaMART${c.dealsIn ? ` — ${c.dealsIn}` : ""}?` : `Is there anything new you'd like to add to your catalog?`),
  hi: (c) => (c.missing && c.product ? `एक छोटी सी बात — ${c.product} पर अभी price नहीं लिखा है। इसका per ${c.unit} rate क्या रहेगा?` : c.catalogEmpty ? `आप IndiaMART पर कौन-कौन से main products list करना चाहेंगे${c.dealsIn ? ` — ${c.dealsIn}` : ""}?` : `Catalog में कुछ नया जोड़ना चाहेंगे?`),
};
const OPEN: Lines = {
  en: (c) => pick([`Sure. Anything else I can help with?`, `Okay, noted. Anything else on your mind?`, `Got it. Anything else regarding IndiaMART?`], c.turn),
  hi: (c) => pick([`जी, ठीक है। और कुछ?`, `अच्छा, note कर लिया। और कुछ बताना चाहेंगे?`, `जी ${hiG(c.g, "समझ गई", "समझ गया")}। IndiaMART से जुड़ी और कोई बात?`], c.turn),
};
const REFUSE: Lines = {
  en: () => `Sorry, I can only help you with IndiaMART-related things — that's all I'm meant to assist with.`,
  hi: (c) => `माफ़ कीजिए, मैं सिर्फ़ IndiaMART से जुड़ी बातों में ही आपकी मदद कर ${hiG(c.g, "सकती", "सकता")} हूँ — हमें बस इसी के लिए रखा गया है।`,
};

const ACK: Record<string, Lines> = {
  voice_gender: { en: () => `Sure!`, hi: () => `जी ज़रूर!` },
  shorter: { en: () => `Sure, quickly then.`, hi: (c) => `जी, short में ${hiG(c.g, "बताती", "बताता")} हूँ।` },
  hurry: { en: () => `Sure, I'll be quick.`, hi: (c) => `जी, जल्दी से ${hiG(c.g, "बताती", "बताता")} हूँ।` },
  more_detail: { en: () => `Sure, let me explain properly.`, hi: (c) => `जी ज़रूर, ठीक से ${hiG(c.g, "समझाती", "समझाता")} हूँ।` },
  slower: { en: () => `Of course.`, hi: () => `जी, ज़रूर।` },
  faster: { en: () => `Sure!`, hi: () => `जी, ठीक है!` },
  frustration: { en: () => `I'm really sorry about that.`, hi: () => `माफ़ कीजिए, परेशानी हुई।` },
  generic: { en: (c) => pick([`Okay, got it.`, `Right, noted.`, `Sure, makes sense.`], c.turn), hi: (c) => pick([`जी, ठीक है।`, `अच्छा, ${hiG(c.g, "समझ गई", "समझ गया")}।`, `हाँ जी, बिल्कुल।`], c.turn) },
};

const BUSY: Lines = {
  en: () => `Oh, no problem at all! When would be a good time for me to call back?`,
  hi: () => `अरे, कोई बात नहीं! आपको किस समय call करूँ, जब आप free हों?`,
};
const CALLBACK_OK: Lines = {
  en: (c) => `Perfect, I'll call you ${c.callback}. Anything else for now?`,
  hi: (c) => `ठीक है, फिर ${c.callback} call ${hiG(c.g, "करती", "करता")} हूँ। अभी और कुछ?`,
};
const NOT_INTERESTED: Lines = {
  en: () => `Totally understand, I won't take more of your time. Thank you so much, have a lovely day!`,
  hi: (c) => `बिल्कुल ${hiG(c.g, "समझ गई", "समझ गया")}, आपका और समय नहीं ${hiG(c.g, "लूँगी", "लूँगा")}। बहुत-बहुत धन्यवाद, आपका दिन अच्छा हो!`,
};
const GOODBYE: Lines = {
  en: (c) => `Thank you so much${c.name ? `, ${c.name} ji` : ""}${c.meeting ? ` — see you at the meeting ${c.meeting}` : c.callback ? ` — talk to you ${c.callback}` : ""}. Have a great day!`,
  hi: (c) => `बहुत-बहुत धन्यवाद${c.name ? ` ${c.name} जी` : ""}${c.meeting ? `, ${c.meeting} meeting में मिलते हैं` : c.callback ? `, फिर ${c.callback} बात करते हैं` : ""}। आपका दिन शुभ हो!`,
};

/** "TMT Steel Bars and Basmati Rice" — the seller's main BuyLead categories (or what they deal in). */
export function topCategories(profile: SellerProfile, n = 2): string | undefined {
  const names = [...(profile.leadCategories ?? [])].sort((a, b) => b.count - a.count).map((c) => c.name);
  const list = names.length ? names : profile.dealsIn ?? [];
  const top = Array.from(new Set(list)).slice(0, n);
  return top.length ? top.join(" and ") : undefined;
}

function ctxFor(profile: SellerProfile, interaction: Interaction): Ctx {
  const p = interaction.currentPersona;
  const missing = missingPriceProducts(profile);
  const t = tenure(profile.memberSince, profile.glid);
  const openIssue = profile.memory.filter((m) => m.category === "complaint").slice(-1)[0]?.fact.replace(/^Issue raised:\s*/i, "").replace(/\s*\(escalated.*$/i, "");
  return {
    name: profile.contactPerson?.split(" ").filter((w) => !/^[A-Z]\.$/.test(w))[0],
    company: profile.companyName,
    cats: topCategories(profile),
    catalogEmpty: profile.catalog.length === 0,
    dealsIn: profile.dealsIn?.length ? profile.dealsIn.slice(0, 4).join(", ") : undefined,
    agent: p.agentName,
    g: p.voiceGender.value,
    len: p.responseLength.value,
    product: missing[0]?.name,
    unit: missing[0]?.unit ?? "unit",
    missing: missing.length,
    category: profile.category,
    callback: interaction.callbackRequested,
    meeting: interaction.meetingTime,
    tenureEn: t?.en ?? "a while",
    tenureHi: t?.hi ?? "काफ़ी समय",
    paid: isPaidMember(profile),
    membership: profile.membership?.replace(/\s*\(demo\)/i, ""),
    openIssue: openIssue && openIssue.length < 120 ? openIssue : undefined,
    turn: interaction.turns.length,
  };
}

/** Renders English/Hindi template text, translating to other languages via Sarvam when available. */
async function render(parts: Lines[], c: Ctx, lang: LanguageCode): Promise<{ text: string; translated: boolean; untranslated: boolean }> {
  if (lang === "hi-IN") return { text: parts.map((p) => p.hi(c)).join(" "), translated: false, untranslated: false };
  const en = parts.map((p) => p.en(c)).join(" ");
  if (lang === "en-IN") return { text: en, translated: false, untranslated: false };
  if (sarvamConfigured()) {
    try {
      return { text: await sarvamTranslate(en, "en-IN", lang, c.g), translated: true, untranslated: false };
    } catch {
      /* fall through */
    }
  }
  return { text: en, translated: false, untranslated: true };
}

export interface TurnContext {
  profile: SellerProfile;
  interaction: Interaction;
  signals: Signal[];
  sellerText: string;
  beat: number; // next beat to deliver
  repeatBeat: boolean; // seller only asked for a style change -> re-deliver the current content
  fillerSpoken?: boolean; // the client already played a short "जी…" while we were thinking
}

export interface ReplyMeta {
  stage?: CallStage;
  issue?: string | null;
  escalated?: boolean;
  meetingTime?: string | null;
  offTopic?: boolean;
  sellerName?: string | null;
  company?: string | null;
}

export interface ComposedReply extends AgentReply { nextBeat: number; note?: string; meta?: ReplyMeta }

const done = (r: { text: string; untranslated: boolean }, lang: LanguageCode, voice: AgentReply["voice"], endCall: boolean, nextBeat: number, meta?: ReplyMeta): ComposedReply =>
  ({ text: r.text, language: lang, voice, engine: "template", endCall, nextBeat, note: r.untranslated ? "untranslated" : undefined, meta });

export async function composeReply(tc: TurnContext): Promise<ComposedReply> {
  const { profile, interaction, signals } = tc;
  const persona = interaction.currentPersona;
  const lang = persona.language.value;
  const voice = { gender: persona.voiceGender.value, speaker: persona.voiceSpeaker };
  const has = (t: Signal["type"]) => signals.some((s) => s.type === t);
  const c = ctxFor(profile, interaction);
  const issue = signals.find((s) => s.type === "issue")?.quote ?? null;
  const canEscalate = escalationAllowed(tc);
  const helpLine = (iss: string) => (canEscalate ? ESCALATE : tipLines(iss));

  // Only the SELLER ends the call: an explicit goodbye / "end the call", or "not interested".
  if (has("not_interested")) return done(await render([NOT_INTERESTED], c, lang), lang, voice, true, LAST_BEAT, { issue });
  if (has("end_call")) return done(await render([...(issue && canEscalate ? [ESCALATE] : []), GOODBYE], c, lang), lang, voice, true, LAST_BEAT, { issue, escalated: !!issue && canEscalate });
  const meetingJustSet = has("callback_time") && !!interaction.meetingTime;
  if (has("callback_time") && !meetingJustSet) return done(await render([CALLBACK_OK], c, lang), lang, voice, false, tc.beat, {});

  const busy = has("busy");
  let nextBeat = tc.repeatBeat || has("off_topic") ? Math.max(1, tc.beat - 1) : tc.beat;
  if (BEAT_STAGE[nextBeat] === "catalog" && !c.missing) nextBeat++; // nothing to fix in the catalog
  nextBeat = Math.min(nextBeat, LAST_BEAT);
  const advance = Math.min(nextBeat + 1, LAST_BEAT);

  if (sarvamConfigured() && process.env.DISABLE_LLM !== "1") {
    try {
      const r = await llmReply(tc, busy);
      if (r?.reply) {
        return {
          text: r.reply, language: lang, voice, engine: "llm", endCall: false,
          nextBeat: busy || r.offTopic ? tc.beat : advance,
          meta: { stage: r.stage, issue: r.issue ?? issue, escalated: r.escalated, meetingTime: r.meetingTime, offTopic: r.offTopic || has("off_topic"), sellerName: r.sellerName, company: r.company },
        };
      }
    } catch (e) {
      console.warn("[agent] LLM failed, using templates:", (e as Error).message);
    }
  }

  // ---------- deterministic template path ----------
  const parts: Lines[] = [];
  const languageSwitched = has("language_switch");
  for (const t of ["voice_gender", "hurry", "frustration", "shorter", "more_detail", "slower", "faster"] as const) {
    if (has(t)) { parts.push(ACK[t]); break; }
  }
  if (has("off_topic")) {
    parts.push(REFUSE);
    parts.push(questionLine(Math.max(0, tc.beat - 1))); // politely return to where we were
    return done(withSwitch(await render(parts, c, lang), languageSwitched, lang, c.g), lang, voice, false, tc.beat, { offTopic: true });
  }
  const facts = extractFacts(tc.sellerText, profile.catalog.map((x) => x.name));
  const price = facts.find((f) => f.category === "pricing");
  if (price) parts.push({ en: () => `Great, noted — ${price.fact.replace("seller quoted ", "")}.`, hi: () => `बढ़िया, note कर लिया — ${price.fact.replace("seller quoted ", "")}।` });
  let escalated = false;
  if (issue && BEAT_STAGE[nextBeat] !== "meeting") { parts.push(helpLine(issue)); escalated = canEscalate; }

  if (busy) parts.push(BUSY);
  else {
    const lines = beatLines(nextBeat, c, issue, canEscalate);
    if (BEAT_STAGE[nextBeat] === "meeting" && issue) escalated = canEscalate;
    if (!parts.length && !languageSwitched && nextBeat >= 4 && !tc.fillerSpoken && !escalated) parts.push(ACK.generic);
    parts.push(...lines);
  }

  const r = withSwitch(await render(parts, c, lang), languageSwitched, lang, c.g);
  return done(r, lang, voice, false, busy ? tc.beat : advance, { stage: BEAT_STAGE[nextBeat], issue, escalated });
}

function beatLines(beat: number, c: Ctx, issue: string | null, canEscalate = false): Lines[] {
  switch (BEAT_STAGE[beat]) {
    case "identity": return [IDENTITY];
    case "feedback": return [FEEDBACK];
    case "meeting": return [issue ? (canEscalate ? ESCALATE : tipLines(issue)) : GLAD, MEETING_ASK];
    case "pitch": return [MEETING_OK, PITCH];
    case "catalog": return [CATALOG];
    default: return [OPEN];
  }
}

/** Just the question of a beat (used to steer back after an off-topic question). */
function questionLine(beat: number): Lines {
  return { identity: IDENTITY, feedback: FEEDBACK, resolve: MEETING_ASK, meeting: MEETING_ASK, pitch: PITCH, catalog: CATALOG, open: OPEN }[BEAT_STAGE[beat]];
}

function withSwitch(r: { text: string; translated: boolean; untranslated: boolean }, switched: boolean, lang: LanguageCode, g: VoiceGender) {
  if (switched) r.text = `${languageInfo(lang).switchConfirm[g]} ${r.text}`;
  return r;
}

/** First line of every call: confirm we are talking to the right person. */
/**
 * Escalation is reserved for when it matters: the seller is frustrated or wants a quick fix,
 * or the same issue came back from an earlier call. At most once per call.
 */
export function escalationAllowed(tc: TurnContext): boolean {
  if ((tc.interaction.escalations?.length ?? 0) > 0) return false;
  const types = new Set([...tc.signals.map((s) => s.type), ...(tc.interaction.signals ?? []).slice(-6).map((s) => s.type)]);
  if (types.has("urgent") || types.has("frustration")) return true;
  const hasIssueNow = tc.signals.some((s) => s.type === "issue");
  const priorComplaint = tc.profile.memory.some((m) => m.category === "complaint");
  return hasIssueNow && priorComplaint;
}

export async function openingLine(profile: SellerProfile, interaction: Interaction): Promise<ComposedReply> {
  const persona = interaction.currentPersona;
  const c = ctxFor(profile, interaction);
  const r = await render([IDENTITY], c, persona.language.value);
  return { text: r.text, language: persona.language.value, voice: { gender: persona.voiceGender.value, speaker: persona.voiceSpeaker }, engine: "template", nextBeat: 1, note: r.untranslated ? "untranslated" : undefined, meta: { stage: "identity" } };
}

// ---------------- LLM path ----------------

const LEN_WORDS: Record<ResponseLength, number> = { concise: 18, balanced: 32, detailed: 60 };

const HUMAN_STYLE = [
  "HOW TO SOUND HUMAN (very important):",
  "- Talk like a friendly, experienced Indian customer-success executive on a real phone call, not like a chatbot or an email.",
  "- Short, natural spoken sentences. Use everyday words and natural fillers where they fit (Hindi: \"अच्छा\", \"हाँ जी\", \"बिल्कुल\", \"अरे वाह\", \"देखिए\"; English: \"oh nice\", \"right\", \"sure\").",
  "- First react to what the seller actually said (warmth, interest, empathy, a little delight), then move on. Vary your phrasing; never repeat a sentence or question word-for-word.",
  "- Never mention or describe your voice, language, speed or style. When the seller asks for a change (voice, language, shorter, slower), just say \"जी ज़रूर!\" / \"Sure!\" and continue in the new style.",
  "  Bad: \"ठीक है, मैं अब male voice में बात कर रहा हूँ।\"  Good: \"जी ज़रूर! तो Subhash जी, ...\"",
  "- Address the seller with the respectful plural (Hindi: \"आप … सकते हैं / बताइए / कीजिए\").",
  "- Ask ONE question at a time. No lists, bullet points or headings.",
  "- HONESTY: never make up prices, market rates, timelines, numbers or processes. Don't suggest a price — the seller decides.",
  "- Solve problems yourself first using the INDIAMART KNOWLEDGE below (tell them where to tap in the app). How much you explain follows the persona's explanation detail: low = just the one key step, medium = up to two steps, high = clear step-by-step.",
  "- You can NOTE information for the seller's profile. Escalating to the senior team is ONLY allowed when the ESCALATION line below says so — and say it once, never repeat it. Don't promise anything else (no \"I'll update your listing\", no \"our team will call you\").",
  "- Don't claim to be human. If the seller sincerely asks whether you are a person or an AI, say honestly that you are IndiaMART's AI assistant.",
  "- NEVER say goodbye or wrap up the call on your own. Only the seller ends the call.",
].join("\n");

function scriptFor(profile: SellerProfile, c: Ctx): string {
  return [
    "CALL SCRIPT — follow these stages in order; move to the next stage only when the current one is done:",
    `1. identity — (already asked) ${c.name ? `"Am I speaking with ${c.name} ji${c.company ? ` from ${c.company}` : ""}?"` : "whether this is the owner of the IndiaMART account (name unknown — ask their name politely)"}${c.company ? "" : " If they mention their name or company, note it in seller_name / company."}`,
    `2. feedback — Introduce yourself (${c.agent}, IndiaMART). Mention they have been using IndiaMART for ${c.tenureEn}${c.cats ? ` and taking BuyLeads for ${c.cats}` : ""}. Ask how their experience has been and whether they face any issues.${c.openIssue ? ` They earlier reported: "${c.openIssue}" — ask whether it got resolved.` : ""}`,
    "3. resolve — If they report an issue: empathise briefly, then SOLVE it with concrete guidance from the INDIAMART KNOWLEDGE (which section/tab/button to use). If it is not covered there, say you have noted it and will check. Follow the ESCALATION line for whether escalating is allowed. If they have no issues, say you are glad to hear it.",
    "4. meeting — Politely ask when they could spare some time for a short meeting with the IndiaMART team (get a day and time).",
    `5. pitch — ${c.paid ? `They are on ${c.membership}: explain that upgrading brings even more BuyLeads to expand the business and top visibility in search.` : "Explain paid-subscription benefits: many more BuyLeads they can use to expand their business, better visibility in buyer searches, verified TrustSEAL badge that buyers trust, dedicated support."} No invented numbers or prices. Only these plan names exist — never invent others: Maximiser Pro, IM Star Pro, IM Leader Pro, IM Industry Leader, TrustSEAL.`,
    `6. catalog — ${c.missing && c.product ? `Ask for the price of "${c.product}" (per ${c.unit}), which is missing on their listing.` : "Skip (catalog is complete)."}`,
    "7. open — Answer any IndiaMART questions; otherwise ask if there is anything else. Do NOT say goodbye.",
    "OFF-TOPIC RULE: If the seller asks anything unrelated to IndiaMART or their business on IndiaMART (general knowledge like \"what is the capital of India\", news, sports, jokes, maths, etc.), do NOT answer it. Politely say you can only help with IndiaMART-related things because that is all you are meant to do, then return to the current stage. Set \"off_topic\": true.",
    "If the seller says they have very little time, be very brief and go straight to the point.",
  ].join("\n");
}

interface LlmOut { reply: string; stage?: CallStage; issue?: string | null; escalated?: boolean; meetingTime?: string | null; offTopic?: boolean; sellerName?: string | null; company?: string | null }

async function llmReply(tc: TurnContext, busy: boolean): Promise<LlmOut | null> {
  const { profile, interaction, signals } = tc;
  const p = interaction.currentPersona;
  const lang = p.language.value;
  const c = ctxFor(profile, interaction);
  const current = interaction.stage ?? "identity";
  const system = [
    `You are ${p.agentName}, ${p.voiceGender.value === "male" ? "a man" : "a woman"} from IndiaMART's seller success team, on a live phone call with an IndiaMART seller.`,
    `Seller: ${profile.contactPerson ?? "name unknown"}${c.company ? ` of ${c.company}` : ""} (${profile.location ?? profile.city ?? ""}). On IndiaMART for ${c.tenureEn}. Membership: ${profile.membership ?? "unknown"}.`,
    profile.leadCategories?.length ? `BuyLead categories this seller consumes: ${profile.leadCategories.map((x) => x.name).join(", ")}.` : "",
    profile.dealsIn?.length ? `Deals in: ${profile.dealsIn.join(", ")}.` : "",
    `Catalog: ${profile.catalog.map((x) => `${x.name} [${x.price != null ? `₹${x.price}/${x.unit}` : "price missing"}]`).join("; ")}.`,
    profile.memory.length ? `Things this seller told us before (use naturally if relevant): ${profile.memory.slice(-5).map((m) => m.fact).join(" | ")}` : "",
    interaction.meetingTime ? `Meeting already agreed: ${interaction.meetingTime}.` : "",
    `PERSONA: language=${languageName(lang)}, style=${p.languageStyle.value}, tone=${p.tone.value}, formality=${p.formality.value}, length=${p.responseLength.value} (at most ~${LEN_WORDS[p.responseLength.value]} words), explanation detail=${p.explanationDetail.value}.`,
    HUMAN_STYLE,
    scriptFor(profile, c),
    knowledgePrompt(tc.sellerText, current),
    escalationAllowed(tc)
      ? "ESCALATION: ALLOWED this turn (seller is frustrated / wants a quick fix / the issue is recurring). Apologise sincerely (\"we're really sorry for the trouble\"), give any quick step you can, and say you are escalating it to the senior team to resolve it ASAP. Set \"escalated\": true."
      : "ESCALATION: NOT allowed this turn — do NOT mention escalating or a senior team. Help with app guidance instead, or say you've noted it.",
    `CURRENT STAGE: ${current}. Stages already covered: ${(interaction.stagesVisited ?? []).join(", ") || "identity"}.${busy ? " The seller is busy right now: be understanding and ask what time suits them for a callback." : ""}`,
    interaction.meetingTime && !(interaction.stagesVisited ?? []).includes("pitch")
      ? `The meeting is booked (${interaction.meetingTime}). In THIS reply: briefly confirm the meeting, then present the ${c.paid ? "upgrade" : "paid-subscription"} benefits (stage "pitch"). Do not skip this.` : "",
    lang === "en-IN" ? "LANGUAGE: reply entirely in plain English — no Hindi words, not even in English letters (no \"ji\" filler sentences like \"main sirf…\")." : "",
    `You are ${p.voiceGender.value === "male" ? "a MAN" : "a WOMAN"}: always use ${p.voiceGender.value} first-person grammar (Hindi "${p.voiceGender.value === "male" ? "करूँगा / समझ गया / बोल रहा" : "करूँगी / समझ गई / बोल रही"}"), even if earlier turns used the other gender.`,
    tc.fillerSpoken ? "You already said a quick acknowledgement (like \"जी\") a moment ago, so don't start with a bare filler word." : "",
    signals.some((s) => ["language_switch", "voice_gender", "shorter", "hurry", "slower", "faster", "more_detail"].includes(s.type))
      ? "The seller just asked for a change in how you speak. It is ALREADY applied — don't talk about it; at most a 1–2 word acknowledgement, then continue." : "",
    signals.some((s) => s.type === "off_topic") ? "The seller's last message looks unrelated to IndiaMART — apply the OFF-TOPIC RULE." : "",
    "Never ask for OTPs, passwords or bank details.",
    `OUTPUT: reply with ONLY a JSON object, no other text:`,
    `{"reply": "<the words to speak, in ${languageName(lang)} (${lang}) script${p.languageStyle.value === "code-mixed" ? ", everyday English business words may stay in English" : ""}>", "stage": "<stage you are in AFTER this reply: ${CALL_STAGES.join("|")}>", "issue": "<short English summary of an IndiaMART problem the seller described in their LAST message, else null>", "escalated": <true if this reply tells them you are escalating an issue>, "meeting_time": "<day/time the seller agreed for the meeting, else null>", "off_topic": <true if the seller's last message was unrelated to IndiaMART>, "seller_name": "<the seller's name if they stated it in their LAST message, else null>", "company": "<their company/firm name if they stated it in their LAST message, else null>"}`,
  ].filter(Boolean).join("\n");
  const history: ChatMessage[] = interaction.turns
    .filter((t) => t.speaker !== "system")
    .slice(-12)
    .map((t) => ({ role: t.speaker === "agent" ? "assistant" : "user", content: t.text }));
  const raw = await sarvamChat([{ role: "system", content: system }, ...history], 700, 0.7, true);
  const parsed = parseLlm(raw);
  if (process.env.DEBUG_LLM === "1") console.log("[llm raw]", raw.slice(0, 400));
  if (!parsed?.reply) return null;
  let reply = parsed.reply.replace(/\*+/g, "").replace(/\s*\n+\s*/g, " ").trim();
  if (!escalationAllowed(tc)) {
    reply = stripEscalation(reply);
    parsed.escalated = false;
  }
  if (signals.some((s) => s.type === "voice_gender")) reply = stripVoiceNarration(reply);
  parsed.reply = await enforceLanguage(reply, lang, p.voiceGender.value);
  return parsed;
}

function parseLlm(raw: string): LlmOut | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const j = JSON.parse(m[0]) as Record<string, unknown>;
      const stage = typeof j.stage === "string" && (CALL_STAGES as readonly string[]).includes(j.stage) ? (j.stage as CallStage) : undefined;
      const str = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null);
      return { reply: str(j.reply) ?? "", stage, issue: str(j.issue), escalated: j.escalated === true, meetingTime: str(j.meeting_time), offTopic: j.off_topic === true, sellerName: str(j.seller_name), company: str(j.company) };
    } catch { /* fall through to plain text */ }
  }
  const text = raw.replace(/^["'\s]+|["'\s]+$/g, "");
  return text && !text.startsWith("{") ? { reply: text } : null;
}

const DEVANAGARI_LANGS: LanguageCode[] = ["hi-IN", "mr-IN"];

const SCRIPT_BLOCKS: [number, number, LanguageCode][] = [
  [0x0900, 0x097f, "hi-IN"], [0x0980, 0x09ff, "bn-IN"], [0x0a00, 0x0a7f, "pa-IN"], [0x0a80, 0x0aff, "gu-IN"], [0x0b00, 0x0b7f, "od-IN"],
  [0x0b80, 0x0bff, "ta-IN"], [0x0c00, 0x0c7f, "te-IN"], [0x0c80, 0x0cff, "kn-IN"], [0x0d00, 0x0d7f, "ml-IN"],
];
function countScripts(text: string): Partial<Record<LanguageCode, number>> {
  const out: Partial<Record<LanguageCode, number>> = {};
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    for (const [lo, hi, code] of SCRIPT_BLOCKS) if (cp >= lo && cp <= hi) out[code] = (out[code] ?? 0) + 1;
  }
  return out;
}

/** Removes "I'll escalate it to the senior team" sentences when escalation isn't warranted. */
function stripEscalation(text: string): string {
  const sentences = text.match(/[^.!?।॥]+[.!?।॥]*\s*/g) ?? [text];
  const kept = sentences.filter((s) => !/escalat|senior team|सीनियर|एस्केलेट|higher (team|level)|ऊपर (भेज|forward)/i.test(s));
  const out = kept.join("").trim();
  return out.length >= 8 ? out : text;
}

/** Drops sentences where the agent narrates its own voice ("I'm now speaking in a male voice"). */
function stripVoiceNarration(text: string): string {
  const sentences = text.match(/[^.!?।॥]+[.!?।॥]*\s*/g) ?? [text];
  const kept = sentences.filter((s) => !/\b(male|female)\s+voice|voice\s+(change|switch)|आवाज़?\s*में|(मेल|फीमेल)\s*(वॉइस|वॉयस)|male voice में|female voice में/i.test(s));
  const out = kept.join("").trim();
  return out.length >= 8 ? out : text;
}

/** Guarantees the spoken reply is in the persona language: if the LLM drifted, translate it. */
async function enforceLanguage(text: string, lang: LanguageCode, gender: VoiceGender): Promise<string> {
  // English target: any real amount of Indic script means the model drifted (e.g. "Sure! तो रमेश जी, …").
  if (lang === "en-IN") {
    const indic = (text.match(/[ऀ-ൿ]/g) ?? []).length;
    if (indic >= 6) {
      console.warn("[agent] LLM mixed Indic script into an English reply; translating");
      // Translate from the Indic language actually present (auto-detect would see "English" and do nothing).
      const src = (Object.entries(countScripts(text)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "hi-IN") as LanguageCode;
      return sarvamTranslate(text, src, "en-IN", gender);
    }
    return text;
  }
  const got = detectScriptLanguage(text);
  if (!got || got === lang) return text;
  if (DEVANAGARI_LANGS.includes(got) && DEVANAGARI_LANGS.includes(lang)) return text;
  // Native-language replies legitimately contain English words; only act when the script is wrong.
  if (got === "en-IN" && !/[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/i.test(text)) return text;
  console.warn(`[agent] LLM replied in ${got} instead of ${lang}; translating`);
  return sarvamTranslate(text, "auto", lang, gender);
}
