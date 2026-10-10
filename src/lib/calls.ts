import { applySignals } from "./adaptation";
import { PACE_TO_TTS, composeReply, openingLine, stageIndex, type ComposedReply } from "./agent";
import { polishAgentText } from "./grammar";
import { detectScriptLanguage, hasNonLatinIndicScript, isLanguageCode, languageName } from "./languages";
import { generatePersona, generatePlan, missingPriceProducts } from "./persona";
import { computeStatus, GLID_HINT, isValidGlid, learnPreference, makeId, normalizeGlid, nowIso } from "./profile";
import { sarvamConfigured, sarvamTranslate } from "./sarvam";
import { detectSignals, extractFacts, looksEnglish, looksHinglish, saysAlways } from "./signals";
import { bumpMetric, getInteraction, getOrInitProfile, getProfile, listInteractions, saveInteraction, saveProfile } from "./store";
import { providerStatus } from "./telephony";
import type {
  CallMode, CallStatus, Interaction, LanguageCode, PostCallSummary, PrecallCheck, PreferenceKey, ProfileUpdate,
  Signal, SignalType, SwitchLogEntry, Turn,
} from "./types";

export class CallError extends Error {
  constructor(message: string, public status = 400, public extra?: Record<string, unknown>) {
    super(message);
  }
}

const ACTIVE: CallStatus[] = ["Preparing", "Initiating", "Ringing", "Connected", "In Progress", "Ending"];

function setStatus(i: Interaction, status: CallStatus, note?: string) {
  i.status = status;
  i.statusHistory.push({ status, at: nowIso(), note });
}

function load(id: string): Interaction {
  const i = getInteraction(id);
  if (!i) throw new CallError("Interaction not found", 404);
  return i;
}

// ---------------- D1: pre-call preparation ----------------

export function prepareCall(rawGlid: string, mode: CallMode): { interaction?: Interaction; checks: PrecallCheck[]; existing?: string } {
  const checks: PrecallCheck[] = [];
  const glid = normalizeGlid(rawGlid ?? "");
  if (!isValidGlid(glid)) {
    checks.push({ id: "glid", label: "Validate GLID", status: "fail", detail: GLID_HINT });
    return { checks };
  }
  checks.push({ id: "glid", label: "Validate GLID", status: "ok", detail: glid });

  const found = getOrInitProfile(glid);
  if (!found) {
    checks.push({ id: "profile", label: "Fetch seller profile", status: "fail", detail: "GLID not found in the seller registry. No profile was created." });
    return { checks };
  }
  const profile = found.profile;
  checks.push({ id: "profile", label: "Fetch seller profile", status: found.initialised ? "warn" : "ok", detail: found.initialised ? "No persona profile existed — initialised a Provisional profile from registry metadata with safe defaults." : `${profile.displayName} · ${profile.status} · updated ${profile.updatedAt}` });

  const provider = providerStatus(mode);
  if (profile.contact.pnsMapped) {
    checks.push({ id: "pns", label: "Resolve contact via PNS mapping", status: "ok", detail: `PNS mapped (${profile.contact.pnsNumberMasked ?? "masked"}); ${profile.contact.registeredNumbers} registered number(s). Full number is never shown.` });
  } else {
    checks.push({ id: "pns", label: "Resolve contact via PNS mapping", status: mode === "pstn" ? "fail" : "warn", detail: mode === "pstn" ? "No PNS mapping — a real call cannot be placed." : "No PNS mapping — a real phone call would be blocked; web/simulated sessions are allowed." });
  }

  const active = listInteractions().find((x) => x.glid === glid && ACTIVE.includes(x.status) && Date.now() - Date.parse(x.createdAt) < 30 * 60 * 1000);
  if (active) {
    checks.push({ id: "dup", label: "Duplicate call guard", status: "fail", detail: `An active interaction (${active.id}) already exists for this GLID. Resume or end it first.` });
    return { checks, existing: active.id };
  }

  const persona = generatePersona(profile);
  const plan = generatePlan(profile, persona);
  bumpMetric("personasGenerated");
  checks.push({ id: "persona", label: "Generate persona & conversation plan", status: "ok", detail: persona.summary });

  const id = makeId("INT");
  checks.push({ id: "interaction", label: "Initialise interaction ID", status: "ok", detail: id });
  checks.push({ id: "binding", label: "Bind GLID + persona to agent", status: "ok", detail: `Agent context bound to ${glid} (profile version ${profile.updatedAt}).` });
  checks.push({ id: "provider", label: "Check voice provider", status: provider.available ? (mode === "web" && !sarvamConfigured() ? "warn" : "ok") : "fail", detail: provider.detail });

  if (checks.some((c) => c.status === "fail")) return { checks };

  const at = nowIso();
  const interaction: Interaction = {
    id, glid, sellerName: profile.displayName, mode, provider: provider.id,
    status: "Preparing", statusHistory: [{ status: "Preparing", at, note: "Pre-call checks passed" }],
    createdAt: at, checks, profileVersionAt: profile.updatedAt,
    initialPersona: persona, currentPersona: persona, overrides: {},
    plan, planStep: 0, beat: 0, stage: "identity", issues: [], escalations: [], turns: [], switchLog: [], signals: [], engineNotes: [],
    postCall: { status: "not-started", attempts: 0 },
  };
  if (mode === "simulated") interaction.scenarioCursor = 0;
  saveInteraction(interaction);
  return { interaction, checks };
}

// ---------------- D2: start ----------------

function agentTurn(reply: ComposedReply): Turn {
  // Same text is shown and spoken: fix verb gender for the current voice, "help assistant" wording.
  reply.text = polishAgentText(reply.text, reply.language, reply.voice.gender);
  return { id: makeId("T"), at: nowIso(), speaker: "agent", text: reply.text, language: reply.language, voice: reply.voice, translatedFrom: reply.note === "untranslated" ? "untranslated" : undefined };
}

export async function startCall(id: string) {
  const i = load(id);
  if (i.status !== "Preparing") throw new CallError(`Call cannot be started from status ${i.status}`, 409);
  const profile = getProfile(i.glid);
  if (!profile) throw new CallError("Seller profile disappeared", 404);
  setStatus(i, "Initiating", i.mode === "simulated" ? "Simulated session — no phone call placed" : "Opening browser audio session");
  setStatus(i, "Connected", i.mode === "simulated" ? "Simulated seller connected" : "Browser microphone session connected (not PSTN)");
  i.startedAt = nowIso();
  const reply = await openingLine(profile, i);
  const turn = agentTurn(reply);
  i.turns.push(turn);
  noteEngine(i, reply);
  i.beat = reply.nextBeat;
  i.planStep = 0;
  setStatus(i, "In Progress");
  saveInteraction(i);
  return { interaction: i, reply: { ...reply, ttsPace: PACE_TO_TTS[i.currentPersona.pace.value] }, turn };
}

function noteEngine(i: Interaction, reply: ComposedReply) {
  if (reply.note === "untranslated") {
    const msg = `Translation to ${languageName(reply.language)} unavailable (no Sarvam key) — template text shown in English.`;
    if (!i.engineNotes.includes(msg)) i.engineNotes.push(msg);
  }
}

// ---------------- D3: live turns ----------------

function cleanName(v?: string | null): string | undefined {
  const s = (v ?? "").replace(/["'.]/g, "").trim();
  if (!s || s.length > 60 || /^(null|unknown|n\/a|none)$/i.test(s)) return undefined;
  return s;
}

/** Fallback when no LLM: "main Rohit bol raha hoon" / "my name is Rohit" / "this is Rohit". */
function nameFromText(text: string): string | undefined {
  const m = text.match(/\b(?:my name is|mera naam)\s+([A-Za-z]{2,})/i)
    ?? text.match(/\b(?:main|mai|this is|i am|i'm)\s+([A-Za-z]{2,})\s+(?:bol|speaking|here)\b/i)
    ?? text.match(/मैं\s+([ऀ-ॿ]+)\s+बोल/)
    ?? text.match(/मेरा नाम\s+([ऀ-ॿ]+)/);
  const n = m?.[1];
  if (!n || /^(bol|baat|abhi|busy|free|theek|thik|hai|hoon|aapse|yahan|here|not|the)$/i.test(n)) return undefined;
  return n[0].toUpperCase() + n.slice(1);
}

const STYLE_SIGNALS: SignalType[] = ["language_switch", "voice_gender", "shorter", "hurry", "more_detail", "slower", "faster", "formal", "informal"];

/**
 * Which language the seller is speaking in this utterance, if it should make the agent switch.
 * - STT language / native script is strong evidence (always mirrored).
 * - Latin text: a full English sentence -> English; romanised Hindi -> Hindi. These heuristic
 *   switches don't override a language the seller explicitly chose earlier in the call.
 */
function mirroredLanguage(i: Interaction, text: string, stt?: { languageCode?: string | null; probability?: number | null }): { lang: LanguageCode; strong: boolean } | null {
  const sttLang = stt?.languageCode && isLanguageCode(stt.languageCode) && (stt.probability == null || stt.probability >= 0.6) ? stt.languageCode : null;
  const script = detectScriptLanguage(text);
  if (script && script !== "en-IN") return { lang: sttLang && sttLang !== "en-IN" ? sttLang : script, strong: true };
  if (looksEnglish(text)) return { lang: "en-IN", strong: sttLang === "en-IN" };
  if (looksHinglish(text)) return { lang: "hi-IN", strong: false };
  return null;
}

export async function sellerTurn(id: string, rawText: string, stt?: { languageCode?: string | null; probability?: number | null; fillerSpoken?: boolean }) {
  const i = load(id);
  if (!["Connected", "In Progress"].includes(i.status)) throw new CallError(`Call is ${i.status}; cannot accept turns`, 409);
  const text = (rawText ?? "").trim().slice(0, 1000);
  if (!text) throw new CallError("Empty utterance");
  const profile = getProfile(i.glid);
  if (!profile) throw new CallError("Seller profile not found", 404);
  i.issues ??= [];
  i.escalations ??= [];
  i.stage ??= "feedback";

  const current = i.currentPersona.language.value;
  const mirror = mirroredLanguage(i, text, stt);
  const turn: Turn = { id: makeId("T"), at: nowIso(), speaker: "seller", text, language: mirror?.lang ?? current };
  i.turns.push(turn);

  let signals: Signal[] = detectSignals(text, current);
  // Native-script utterances: also translate to English and run the same rules.
  if (hasNonLatinIndicScript(text) && sarvamConfigured()) {
    try {
      const en = await sarvamTranslate(text, "auto", "en-IN", i.currentPersona.voiceGender.value);
      for (const s of detectSignals(en, current)) if (!signals.some((x) => x.type === s.type)) signals.push({ ...s, quote: text, label: `${s.label} (via translation: “${en}”)` });
    } catch { /* rules on original text only */ }
  }
  const explicitLang = signals.find((s) => s.type === "language_switch");
  if (explicitLang) i.explicitLanguage = true;
  // Implicit mirroring: reply in the language the seller is actually speaking.
  else if (mirror && mirror.lang !== current && (mirror.strong || !i.explicitLanguage)) {
    signals.unshift({ type: "language_switch", label: `Seller switched to ${languageName(mirror.lang)} — replying in ${languageName(mirror.lang)}`, quote: text, value: mirror.lang, explicit: false, persistentCandidate: true, confidence: stt?.probability ?? 0.7 });
  }

  turn.signals = signals.map((s) => s.type);
  const entries: SwitchLogEntry[] = applySignals(i, signals, turn);
  for (const s of signals) i.signals.push({ ...s, turnId: turn.id, at: turn.at });
  if (signals.length) i.lastSignal = signals[0];

  // A time given while we're asking for a meeting is the meeting slot, not a callback.
  const timeSig = signals.find((s) => s.type === "callback_time");
  if (timeSig && (i.stage === "meeting" || /meeting|मीटिंग|milte|free|फ्री/i.test(text))) {
    i.meetingTime = timeSig.value;
    i.callbackRequested = undefined;
  }

  const facts = extractFacts(text, profile.catalog.map((c) => c.name));
  const styleOnly = signals.length > 0 && signals.every((s) => STYLE_SIGNALS.includes(s.type)) && facts.length === 0 && i.beat > 1;

  const reply = await composeReply({ profile, interaction: i, signals, sellerText: text, beat: i.beat, repeatBeat: styleOnly, fillerSpoken: !!stt?.fillerSpoken });
  const aTurn = agentTurn(reply);
  i.turns.push(aTurn);
  noteEngine(i, reply);
  i.beat = reply.nextBeat;

  // Record what the agent learned / did this turn.
  const meta = reply.meta ?? {};
  if (meta.stage) {
    i.stage = meta.stage;
    i.stagesVisited = Array.from(new Set([...(i.stagesVisited ?? ["identity"]), meta.stage]));
  }
  if (meta.meetingTime && !i.meetingTime) i.meetingTime = meta.meetingTime;
  // Identity the seller stated ("main Rohit bol raha hoon, Kolkata Stationers se").
  const statedName = cleanName(meta.sellerName) ?? nameFromText(text);
  if (statedName) i.statedName = statedName;
  const statedCompany = cleanName(meta.company);
  if (statedCompany) i.statedCompany = statedCompany;
  // Record an issue only when THIS message reports one (the LLM tends to re-summarise old issues).
  const issueSignal = signals.find((s) => s.type === "issue");
  const newIssue = issueSignal || (meta.issue && i.issues.length === 0) ? (meta.issue ?? issueSignal?.quote) : undefined;
  const issueText = newIssue ?? (meta.escalated ? i.issues[i.issues.length - 1]?.issue : undefined);
  if (newIssue && !i.issues.some((x) => x.issue === newIssue)) i.issues.push({ at: turn.at, turnId: turn.id, issue: newIssue });
  if (meta.escalated) {
    const what = issueText ?? i.issues[i.issues.length - 1]?.issue ?? text;
    if (!i.escalations.some((x) => x.issue === what)) {
      i.escalations.push({ at: aTurn.at, turnId: aTurn.id, issue: what });
      i.switchLog.push({ id: makeId("SW"), at: aTurn.at, turnId: turn.id, signalType: "issue", signal: "Issue escalated to senior team", quote: text, dimension: "plan", previous: "Resolve", next: "Escalated", reason: `Agent could not resolve directly: ${what}`, scope: "persistent-candidate" });
    }
  }
  i.planStep = stageIndex(i.stage ?? "feedback");
  if (reply.endCall) i.agentEnded = true;
  saveInteraction(i);
  return { interaction: i, reply: { ...reply, ttsPace: PACE_TO_TTS[i.currentPersona.pace.value] }, sellerTurn: turn, agentTurn: aTurn, signals, switches: entries };
}

// ---------------- Page I: deterministic simulated seller ----------------

export function scenarioFor(i: Interaction): string[] {
  const profile = getProfile(i.glid)!;
  const appCalls = profile.history.filter((h) => !h.interactionId.startsWith("SEED_")).length;
  const persona = i.initialPersona;
  const english = persona.language.value === "en-IN";
  const name = (profile.contactPerson ?? "").split(" ").filter((w) => !/^[A-Z]\.$/.test(w))[0] ?? "";
  const altLang = profile.secondaryLanguage && !["hi-IN", "en-IN"].includes(profile.secondaryLanguage) ? profile.secondaryLanguage : "gu-IN";
  const otherGender = persona.voiceGender.value === "female" ? "male" : "female";
  const thisGender = persona.voiceGender.value;
  const missing = missingPriceProducts(profile)[0];
  const priced = profile.catalog.find((c) => c.price != null);
  const price = priced?.price ? Math.round(priced.price * 1.1 * 100) / 100 : 100;

  if (appCalls === 0) {
    // Covers: identity, issue -> escalation, voice change with negation + English mirroring,
    // off-topic refusal, Hinglish mirroring + meeting slot, hurry, explicit language, catalog, seller ends.
    return english
      ? [
          name ? `Yes, this is ${name} speaking.` : "Yes, I am the owner of this account.",
          "Honestly, the BuyLeads I get are mostly from outside my area, which is a real problem.",
          `I don't like this ${thisGender} voice, can you switch to a ${otherGender} voice?`,
          "By the way, what is the capital of India?",
          "Okay. Meeting ke liye kal shaam 5 baje free hoon.",
          "Time kam hai, jaldi bataiye.",
          `${languageName(altLang)} mein baat kijiye please.`,
          missing ? `${missing.name} ka rate ${price} rupaye per ${missing.unit ?? "unit"} rakh dijiye.` : "Price sab theek hai, abhi naya product nahi hai.",
          "Theek hai, paid plan ke baare mein sochta hoon. Bye.",
        ]
      : [
          name ? `Haan ji, main ${name} hoon.` : "Haan ji, main hi is account ka owner hoon.",
          "Ek issue hai, mujhe jo BuyLeads aa rahe hain woh mere area ke nahi hote.",
          `I don't like this ${thisGender} voice, can you switch to a ${otherGender} voice?`,
          "By the way, what is the capital of India?",
          "Okay. Meeting ke liye kal shaam 5 baje free hoon.",
          "Time kam hai, jaldi bataiye.",
          `${languageName(altLang)} mein baat kijiye please.`,
          missing ? `${missing.name} ka rate ${price} rupaye per ${missing.unit ?? "unit"} rakh dijiye.` : "Price sab theek hai, abhi naya product nahi hai.",
          "Theek hai, paid plan ke baare mein sochta hoon. Bye.",
        ];
  }
  return english
    ? [
        name ? `Yes, ${name} here.` : "Yes, speaking.",
        "The issue I told you about last time is still not resolved.",
        "This time please explain in a bit more detail.",
        "I'm free for the meeting on Monday at 11 am.",
        missing ? `${missing.name} is ${price} rupees per ${missing.unit ?? "unit"}.` : "Okay, I will think about the paid plan.",
        "Thanks, bye.",
      ]
    : [
        name ? `Haan ji, ${name} hoon, boliye.` : "Haan ji, boliye.",
        "Pichhli baar jo issue bataya tha woh abhi tak solve nahi hua.",
        "Is baar thoda detail mein samjhaiye.",
        "Meeting ke liye Monday 11 baje theek rahega.",
        missing ? `${missing.name} ka rate ${price} rupaye per ${missing.unit ?? "unit"} hai.` : "Theek hai, paid plan ke baare mein sochta hoon.",
        "Theek hai, dhanyavaad. Bye.",
      ];
}

export async function simulateNext(id: string) {
  const i = load(id);
  if (i.mode !== "simulated") throw new CallError("Not a simulated interaction", 400);
  const script = scenarioFor(i);
  const cursor = i.scenarioCursor ?? 0;
  if (cursor >= script.length) throw new CallError("Scenario finished", 409);
  i.scenarioCursor = cursor + 1;
  saveInteraction(i);
  const r = await sellerTurn(id, script[cursor]);
  return { ...r, scenario: { cursor: cursor + 1, total: script.length } };
}

// ---------------- D4: end + post-call profile update ----------------

export async function endCall(id: string, reason: "operator" | "agent" | "provider" = "operator") {
  const i = load(id);
  if (i.status === "Completed" || i.status === "Cancelled" || i.status === "Failed") {
    if (i.postCall.status !== "done" && i.turns.some((t) => t.speaker === "seller")) return runPostCall(id);
    return i;
  }
  const started = i.startedAt ?? i.createdAt;
  setStatus(i, "Ending", `Ended by ${reason}`);
  i.endedAt = nowIso();
  i.durationSec = Math.max(0, Math.round((Date.parse(i.endedAt) - Date.parse(started)) / 1000));
  const sellerSpoke = i.turns.some((t) => t.speaker === "seller");
  setStatus(i, sellerSpoke ? "Completed" : "Cancelled", sellerSpoke ? undefined : "Ended before the seller spoke");
  i.outcome = outcomeOf(i);
  saveInteraction(i);
  if (!sellerSpoke) return i;
  return runPostCall(id);
}

function outcomeOf(i: Interaction): string {
  if (!i.turns.some((t) => t.speaker === "seller")) return "Cancelled before conversation";
  const types = new Set(i.signals.map((s) => s.type));
  const facts = i.turns.some((t) => t.speaker === "seller" && extractFacts(t.text, []).some((f) => f.category === "pricing"));
  if (types.has("not_interested")) return "Seller not interested";
  const parts: string[] = [];
  if (i.meetingTime) parts.push(`Meeting booked (${i.meetingTime})`);
  if (i.escalations?.length) parts.push(`${i.escalations.length} issue(s) escalated`);
  else if (i.issues?.length) parts.push(`${i.issues.length} issue(s) raised`);
  if (i.callbackRequested) parts.push(`Callback requested (${i.callbackRequested})`);
  if (facts) parts.push("catalog info captured");
  if (parts.length) return parts.join("; ");
  return i.agentEnded ? "Completed" : "Ended mid-conversation";
}

const SIGNAL_TO_FIELDS: Partial<Record<SignalType, (s: Signal) => { field: PreferenceKey; value: string }[]>> = {
  language_switch: (s) => [{ field: "language", value: s.value! }],
  voice_gender: (s) => [{ field: "voiceGender", value: s.value! }],
  shorter: () => [{ field: "responseLength", value: "concise" }, { field: "explanationDetail", value: "low" }],
  more_detail: () => [{ field: "responseLength", value: "detailed" }, { field: "explanationDetail", value: "high" }],
  slower: () => [{ field: "pace", value: "slow" }],
  faster: () => [{ field: "pace", value: "fast" }],
  formal: () => [{ field: "formality", value: "formal" }],
  informal: () => [{ field: "formality", value: "informal" }],
  callback_time: (s) => [{ field: "bestTimeToCall", value: s.value! }],
};

const TRAIT_FOR: Partial<Record<SignalType, string>> = {
  shorter: "Prefers short, to-the-point answers",
  more_detail: "Likes detailed explanations",
  busy: "Often busy during calls",
  frustration: "Has shown frustration with repeated calls",
  informal: "Speaks casually",
  slower: "Prefers a slower speaking pace",
  hurry: "Often short on time — keep calls quick",
  issue: "Has raised issues with IndiaMART",
};

export async function runPostCall(id: string): Promise<Interaction> {
  const i = load(id);
  if (i.postCall.status === "done") return i;
  i.postCall = { status: "processing", attempts: i.postCall.attempts + 1 };
  saveInteraction(i);
  try {
    const profile = getProfile(i.glid);
    if (!profile) throw new Error(`Profile for ${i.glid} not found`);
    const at = nowIso();
    const updates: ProfileUpdate[] = [];
    const rejected: ProfileUpdate[] = [];
    const observations: string[] = [];

    // One observation per preference field per call (the last value the seller asked for).
    const perField = new Map<PreferenceKey, { value: string; s: Signal & { turnId: string } }>();
    for (const s of i.signals) {
      observations.push(`${s.label} — “${s.quote}”`);
      if (!s.persistentCandidate) continue;
      if (s.type === "callback_time" && s.value === i.meetingTime) continue; // a meeting slot isn't a calling preference
      for (const f of SIGNAL_TO_FIELDS[s.type]?.(s) ?? []) perField.set(f.field, { value: f.value, s });
    }
    for (const [field, { value, s }] of perField) {
      const r = learnPreference(profile, {
        field, value, explicit: s.explicit, always: saysAlways(s.quote), interactionId: i.id, at,
        note: `${s.label} during call ${i.id}.`, quote: s.quote,
      });
      if (r.accepted) {
        updates.push(r.update);
        if (r.update.from !== r.update.to) profile.changeLog.push({ at, interactionId: i.id, field, from: r.update.from, to: r.update.to, reason: r.update.reason, source: "learned" });
      } else rejected.push(r.rejected);
    }

    // Facts the seller communicated -> memory (+ fill a missing catalog price when quoted for that product).
    const memoryAdded: string[] = [];
    for (const t of i.turns.filter((x) => x.speaker === "seller")) {
      for (const f of extractFacts(t.text, profile.catalog.map((c) => c.name))) {
        if (profile.memory.some((m) => m.fact === f.fact)) continue;
        profile.memory.push({ id: makeId("MEM"), at, interactionId: i.id, category: f.category, fact: f.fact, quote: t.text, source: "learned" });
        memoryAdded.push(f.fact);
        if (f.category === "pricing") {
          const item = profile.catalog.find((c) => c.price == null && f.fact.startsWith(`${c.name}:`));
          const amount = Number(f.fact.match(/₹([\d.]+)/)?.[1]);
          if (item && Number.isFinite(amount) && amount > 0) {
            profile.changeLog.push({ at, interactionId: i.id, field: `catalog.${item.productId}.price`, from: "missing", to: `₹${amount}/${item.unit ?? "unit"}`, reason: `Seller quoted the price on call: “${t.text}”`, source: "learned" });
            updates.push({ field: `Catalog price · ${item.name}`, from: "missing", to: `₹${amount}/${item.unit ?? "unit"}`, reason: "Seller quoted the price on the call." });
            item.price = amount;
          }
        }
      }
    }
    // Identity the seller stated on the call fills unknown profile fields (never overwrites known ones).
    if (i.statedName && !profile.contactPerson) {
      profile.changeLog.push({ at, interactionId: i.id, field: "contactPerson", from: "unknown", to: i.statedName, reason: "Stated by the seller on the call.", source: "learned" });
      updates.push({ field: "Contact person", from: "unknown", to: i.statedName, reason: "Stated by the seller on the call." });
      profile.contactPerson = i.statedName;
      if (/^Unknown seller/i.test(profile.displayName)) profile.displayName = i.statedName;
    }
    // A "company" that is just the seller's own name is the LLM echoing the name, not a company.
    const sameAsName = (s: string) => [profile.contactPerson, profile.displayName, i.statedName].some((n) => n && n.trim().toLowerCase() === s.trim().toLowerCase());
    if (i.statedCompany && !profile.companyName && !sameAsName(i.statedCompany)) {
      profile.changeLog.push({ at, interactionId: i.id, field: "companyName", from: "unknown", to: i.statedCompany, reason: "Stated by the seller on the call.", source: "learned" });
      updates.push({ field: "Company", from: "unknown", to: i.statedCompany, reason: "Stated by the seller on the call." });
      profile.companyName = i.statedCompany;
    }
    const remember = (category: "availability" | "complaint" | "business", fact: string, quote?: string) => {
      if (profile.memory.some((m) => m.fact === fact)) return;
      profile.memory.push({ id: makeId("MEM"), at, interactionId: i.id, category, fact, quote, source: "learned" });
      memoryAdded.push(fact);
    };
    if (i.callbackRequested) remember("availability", `Asked to be called ${i.callbackRequested}`);
    if (i.meetingTime) remember("business", `Agreed to a meeting with the IndiaMART team: ${i.meetingTime} (booked ${at.slice(0, 10)})`);
    // Issues the seller raised: escalated ones are flagged so the next call follows up on them.
    for (const iss of i.issues ?? []) {
      const escalated = (i.escalations ?? []).some((e) => e.issue === iss.issue);
      remember("complaint", `Issue raised: ${iss.issue}${escalated ? ` (escalated ${at.slice(0, 10)})` : ""}`, i.turns.find((t) => t.id === iss.turnId)?.text);
    }
    for (const e of i.escalations ?? []) {
      if (!(i.issues ?? []).some((x) => x.issue === e.issue)) remember("complaint", `Issue raised: ${e.issue} (escalated ${at.slice(0, 10)})`);
    }

    // Behaviour traits & summary.
    for (const s of i.signals) {
      const trait = TRAIT_FOR[s.type];
      if (trait && !profile.behaviour.traits.includes(trait)) profile.behaviour.traits.push(trait);
    }
    const langs = Array.from(new Set(i.turns.filter((t) => t.speaker === "agent").map((t) => t.language)));
    profile.behaviour.summary = `Last call (${i.id}, ${i.mode}): ${i.turns.filter((t) => t.speaker === "seller").length} seller turns, ${i.switchLog.length} adaptations, languages: ${langs.map(languageName).join(", ")}. Outcome: ${i.outcome}.`;

    profile.history.push({ interactionId: i.id, at, mode: i.mode, outcome: i.outcome ?? "Completed", adaptations: i.switchLog.length, languagesUsed: langs });
    profile.interactionCount += 1;
    profile.lastInteractionAt = i.endedAt ?? at;
    const prevStatus = profile.status;
    profile.status = computeStatus(profile);
    if (prevStatus !== profile.status) profile.changeLog.push({ at, interactionId: i.id, field: "profile", from: prevStatus, to: profile.status, reason: `${profile.interactionCount} recorded interaction(s).`, source: "learned" });
    saveProfile(profile); // also regenerates the Markdown twin

    const summary: PostCallSummary = {
      interactionId: i.id,
      durationSec: i.durationSec ?? null,
      outcome: i.outcome ?? "Completed",
      initialPersonaSummary: i.initialPersona.summary,
      adaptations: i.switchLog.length,
      observations,
      updates,
      rejected,
      memoryAdded,
      profileUpdatedAt: profile.updatedAt,
    };
    i.postCall = { status: "done", summary, attempts: i.postCall.attempts };
    saveInteraction(i);
    return i;
  } catch (e) {
    i.postCall = { status: "failed", error: (e as Error).message, attempts: i.postCall.attempts };
    saveInteraction(i);
    return i;
  }
}

export function getCall(id: string) {
  return load(id);
}
