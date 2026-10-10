import { AGENT_NAMES, languageName, speakerFor } from "./languages";
import { tenure } from "./profile";
import { ttsModel } from "./sarvam";
import type {
  ConversationPlan, Persona, PersonaDimension, PersonaDimensionKey, PreferenceField, SellerProfile, VoiceGender,
} from "./types";

function dim<T extends string>(f: PreferenceField<T>): PersonaDimension<T> {
  return { value: f.value, reason: f.reason, evidenceCount: f.evidence.length || f.observations, confidence: f.confidence, source: f.source };
}

export function personaSummary(p: Persona): string {
  const parts = [
    `${languageName(p.language.value)} (${p.languageStyle.value})`,
    `${p.voiceGender.value} voice "${p.agentName}"`,
    `${p.tone.value}, ${p.formality.value}`,
    `${p.responseLength.value} answers`,
    `${p.pace.value} pace`,
  ];
  return parts.join(" · ");
}

/** Builds the call persona from the seller's stored profile. */
export function generatePersona(profile: SellerProfile): Persona {
  const pr = profile.preferences;
  const persona: Persona = {
    glid: profile.glid,
    generatedAt: new Date().toISOString(),
    agentName: AGENT_NAMES[pr.voiceGender.value],
    voiceSpeaker: speakerFor(ttsModel(), pr.voiceGender.value),
    language: dim(pr.language),
    languageStyle: dim(pr.languageStyle),
    voiceGender: dim(pr.voiceGender),
    tone: dim(pr.tone),
    formality: dim(pr.formality),
    pace: dim(pr.pace),
    responseLength: dim(pr.responseLength),
    explanationDetail: dim(pr.explanationDetail),
    openingStyle: dim(pr.openingStyle),
    objectionHandling: dim(pr.objectionHandling),
    summary: "",
  };
  // Derived choices: a seller who wants concise answers gets a direct opening.
  if (pr.responseLength.value === "concise" && pr.openingStyle.source !== "learned" && pr.openingStyle.source !== "manual") {
    persona.openingStyle = { value: "direct", reason: "Derived: seller prefers concise answers, so skip small talk and state the purpose immediately.", evidenceCount: pr.responseLength.observations, confidence: pr.responseLength.confidence, source: "learned" };
  }
  persona.summary = personaSummary(persona);
  return persona;
}

/** Applies a call-scoped override to a persona (returns a new persona). */
export function withOverride(p: Persona, key: PersonaDimensionKey, value: string, reason: string): Persona {
  const next: Persona = JSON.parse(JSON.stringify(p));
  (next[key] as PersonaDimension<string>) = { value, reason, evidenceCount: 1, confidence: 0.9, source: "call-override" };
  if (key === "voiceGender") {
    next.agentName = AGENT_NAMES[value as VoiceGender];
    next.voiceSpeaker = speakerFor(ttsModel(), value as VoiceGender);
  }
  next.summary = personaSummary(next);
  return next;
}

export function missingPriceProducts(profile: SellerProfile) {
  return profile.catalog.filter((c) => c.price == null);
}

export function isPaidMember(profile: SellerProfile): boolean {
  return !!profile.membership && !/free/i.test(profile.membership);
}

/** Conversation plan for an IndiaMART seller call, generated from the profile. Step ids = CallStage. */
export function generatePlan(profile: SellerProfile, _persona: Persona): ConversationPlan {
  const missing = missingPriceProducts(profile);
  const t = tenure(profile.memberSince, profile.glid);
  const openIssues = profile.memory.filter((m) => m.category === "complaint").slice(-2);
  const paid = isPaidMember(profile);
  const steps = [
    { id: "identity", title: "Confirm identity", goal: `Ask: "Am I speaking with ${profile.contactPerson ?? "the owner"} of ${profile.companyName ?? profile.displayName}?"` },
    { id: "feedback", title: "Feedback", goal: `Introduce yourself; mention they have been using IndiaMART for ${t?.en ?? "a while"} and ask about their experience and any issues.${openIssues.length ? ` Also ask whether the earlier issue (${openIssues.map((m) => m.fact).join("; ")}) got resolved.` : ""}` },
    { id: "resolve", title: "Resolve or escalate", goal: "Help with the issue if you are sure of the answer; otherwise apologise sincerely and escalate it to the senior team for a quick resolution." },
    { id: "meeting", title: "Meeting slot", goal: "Ask when the seller is free for a short meeting with an IndiaMART representative (day + time)." },
    { id: "pitch", title: paid ? "Upgrade benefits" : "Paid subscription benefits", goal: paid ? `They are on ${profile.membership}: explain how a higher plan brings more BuyLeads and visibility.` : "Explain paid-plan benefits: many more BuyLeads to grow the business, better search visibility, TrustSEAL/verified badge, dedicated support." },
    { id: "catalog", title: "Catalog gap", goal: missing.length ? `Ask for the price of "${missing[0].name}" (per ${missing[0].unit ?? "unit"}).` : "Ask whether any new products should be added." },
    { id: "open", title: "Open conversation", goal: "Answer IndiaMART questions; only the seller ends the call." },
  ];
  const talkingPoints = [
    "Paid plans: more BuyLeads every week, higher ranking in search results, verified/TrustSEAL badge, dedicated account support (no made-up numbers).",
    "Products with a price get more buyer enquiries than those without.",
    "Enquiries are managed from the Lead Manager in the IndiaMART seller app; BuyLead preferences (category, city) can be set there.",
    profile.contact.pnsMapped ? "Buyer calls reach the seller through the PNS (Preferred Number Service) number." : "PNS is not mapped yet — offer help setting it up.",
  ];
  if (profile.memory.length) talkingPoints.push(`Remember: ${profile.memory.slice(-2).map((m) => m.fact).join(" / ")}`);
  const avoid = ["Inventing statistics, prices, timelines or buyer names", "Asking for OTPs, passwords or bank details", "Answering questions unrelated to IndiaMART"];
  if (profile.preferences.bestTimeToCall.value !== "unknown") avoid.push(`Long calls outside the seller's preferred time (${profile.preferences.bestTimeToCall.value})`);
  return {
    objective: `Collect feedback${openIssues.length ? " (follow up on the earlier issue)" : ""}, resolve/escalate issues, book a meeting, and present ${paid ? "upgrade" : "paid-plan"} benefits.`,
    steps,
    talkingPoints,
    avoid,
  };
}
