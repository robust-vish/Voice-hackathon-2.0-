import { languageName } from "./languages";
import type {
  Evidence, PreferenceField, PreferenceKey, PreferenceSource, Preferences, ProfileStatus,
  ProfileUpdate, RegistryEntry, SellerProfile,
} from "./types";
import { PROFILE_SCHEMA_VERSION } from "./types";
import { DEFAULT_LANGUAGE, MEMBER_SINCE } from "./seed-data";

/** "YYYY-MM" -> human tenure, e.g. { en: "4 years", hi: "4 साल" }. */
export function tenure(memberSince: string | undefined, glid?: string): { en: string; hi: string } | null {
  const since = memberSince ?? (glid ? MEMBER_SINCE[glid] : undefined);
  const m = since?.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const now = new Date();
  const months = (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));
  if (months < 1) return { en: "less than a month", hi: "एक महीने से कम" };
  if (months < 12) return { en: `${months} month${months > 1 ? "s" : ""}`, hi: `${months} महीने` };
  const y = Math.floor(months / 12);
  return { en: `${y} year${y > 1 ? "s" : ""}`, hi: `${y} साल` };
}

export const nowIso = () => new Date().toISOString();

export function makeId(prefix: string): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}_${t}${r}`;
}

/** GLID normalisation: trim, upper-case, spaces/hyphens -> underscore. */
export function normalizeGlid(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function isValidGlid(glid: string): boolean {
  return /^[A-Z0-9_]{3,40}$/.test(glid);
}

function field<T extends string>(value: T, source: PreferenceSource, confidence: number, reason: string, at: string): PreferenceField<T> {
  return { value, source, confidence, observations: source === "learned" ? 1 : 0, tally: {}, reason, evidence: [], updatedAt: at };
}

export function defaultPreferences(entry: Partial<RegistryEntry>, at: string): Preferences {
  const lang = entry.languageHint ?? DEFAULT_LANGUAGE;
  const where = [entry.city, entry.state].filter(Boolean).join(", ");
  return {
    language: entry.languageHint
      ? field(lang, "metadata", 0.5, `Registry language hint for a seller based in ${where || "their region"} (${languageName(lang)}). Not yet confirmed on a call.`, at)
      : field(lang, "default", 0.3, "No language information available; Hindi is the safe default.", at),
    languageStyle: field("code-mixed", "default", 0.4, "Default: B2B sellers usually mix English trade terms (price, MOQ, GST) into their language.", at),
    voiceGender: field("female", "default", 0.3, "Default agent voice; no stated preference yet.", at),
    tone: field("warm", "default", 0.4, "Default: warm and helpful until the seller's style is known.", at),
    formality: field("formal", "default", 0.5, "Default: respectful address ('aap' / 'ji') for a first conversation.", at),
    pace: field("normal", "default", 0.4, "Default speaking pace.", at),
    responseLength: field("balanced", "default", 0.4, "Default: 1–2 sentence answers until the seller's preference is known.", at),
    explanationDetail: field("medium", "default", 0.4, "Default level of explanation.", at),
    openingStyle: field("greeting-first", "default", 0.4, "Default: greet, introduce, then state purpose.", at),
    objectionHandling: field("acknowledge-and-reassure", "default", 0.4, "Default: acknowledge the concern, then reassure with one concrete benefit.", at),
    bestTimeToCall: field("unknown", "default", 0.2, "Seller has not told us a preferred calling time.", at),
  };
}

export function profileFromRegistry(entry: RegistryEntry, status: ProfileStatus, at = nowIso()): SellerProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    glid: entry.glid,
    isDemo: entry.glid.startsWith("DEMO_"),
    displayName: entry.displayName,
    contactPerson: entry.contactPerson,
    companyName: entry.companyName ?? entry.displayName,
    category: entry.category,
    subCategories: entry.subCategories ?? [],
    city: entry.city,
    state: entry.state,
    membership: entry.membership,
    trustSeal: entry.trustSeal,
    gstVerified: entry.gstVerified,
    yearEstablished: entry.yearEstablished,
    memberSince: entry.memberSince ?? MEMBER_SINCE[entry.glid],
    secondaryLanguage: entry.secondaryLanguage,
    contact: { pnsMapped: entry.pnsMapped, pnsNumberMasked: entry.pnsNumberMasked, registeredNumbers: entry.registeredNumbers },
    catalog: entry.catalog,
    buyLeadInterests: entry.buyLeadInterests ?? [],
    preferences: defaultPreferences(entry, at),
    behaviour: { summary: "No conversations recorded yet.", traits: [] },
    memory: [],
    status,
    interactionCount: 0,
    lastInteractionAt: null,
    createdAt: at,
    updatedAt: at,
    history: [],
    changeLog: [{ at, field: "profile", from: "-", to: status, reason: status === "Provisional" ? "Provisional profile initialised from authorized registry metadata." : "Profile created from registry metadata.", source: "metadata" }],
  };
}

export function computeStatus(p: SellerProfile): ProfileStatus {
  if (p.interactionCount >= 3) return "Established";
  if (p.interactionCount >= 1) return "Provisional";
  return p.status === "Established" ? "Provisional" : p.status;
}

export function confidenceFor(observations: number, explicit: boolean): number {
  const base = explicit ? 0.6 : 0.45;
  return Math.min(0.95, Math.round((base + 0.12 * Math.max(0, observations - 1)) * 100) / 100);
}

export interface LearnInput {
  field: PreferenceKey;
  value: string;
  explicit: boolean;
  always?: boolean;
  interactionId?: string;
  note: string;
  quote?: string;
  at?: string;
}

export type LearnResult = { accepted: true; update: ProfileUpdate } | { accepted: false; rejected: ProfileUpdate };

/**
 * Validates and applies one observed preference to the profile.
 * Learned values only replace a value when the evidence is at least as strong
 * as what supports the current one; manual overrides are only replaced when the
 * seller explicitly says it should always be that way.
 */
export function learnPreference(p: SellerProfile, input: LearnInput): LearnResult {
  const at = input.at ?? nowIso();
  const f = p.preferences[input.field] as PreferenceField<string>;
  const from = f.value;
  f.tally[input.value] = (f.tally[input.value] ?? 0) + 1;
  const n = f.tally[input.value];
  const ev: Evidence = { interactionId: input.interactionId, at, note: input.note, quote: input.quote };

  if (from === input.value) {
    f.observations = Math.max(f.observations, n);
    if (f.source !== "manual") f.source = "learned";
    f.confidence = Math.max(f.confidence, confidenceFor(f.observations, input.explicit));
    f.reason = input.note;
    f.evidence = [...f.evidence, ev].slice(-10);
    f.updatedAt = at;
    return { accepted: true, update: { field: input.field, from, to: input.value, reason: `Reinforced: ${input.note} (now ${f.observations} observations, confidence ${f.confidence}).` } };
  }

  let canFlip: boolean;
  let why: string;
  if (f.source === "manual") {
    canFlip = !!input.always;
    why = "the current value is a manual override and the seller did not say this should always apply";
  } else if (f.source === "default" || f.source === "metadata") {
    canFlip = input.explicit || n >= 2;
    why = "an inferred (non-explicit) signal needs at least 2 observations to replace a default";
  } else {
    canFlip = !!input.always || n >= f.observations || (input.explicit && f.confidence < 0.8);
    why = `the current value '${from}' has ${f.observations} observations (confidence ${f.confidence})`;
  }

  if (!canFlip) {
    return { accepted: false, rejected: { field: input.field, from, to: input.value, reason: `Not applied: ${why}. Recorded as 1 observation for '${input.value}'.` } };
  }

  f.value = input.value;
  f.source = "learned";
  f.observations = n;
  f.confidence = input.always ? Math.max(0.85, confidenceFor(n, true)) : confidenceFor(n, input.explicit);
  f.reason = input.note;
  f.evidence = [...f.evidence, ev].slice(-10);
  f.updatedAt = at;
  return { accepted: true, update: { field: input.field, from, to: input.value, reason: input.note } };
}

const PREF_LABELS: Record<PreferenceKey, string> = {
  language: "Preferred language",
  languageStyle: "Language style",
  voiceGender: "Agent voice",
  tone: "Tone",
  formality: "Formality",
  pace: "Speaking pace",
  responseLength: "Response length",
  explanationDetail: "Explanation detail",
  openingStyle: "Opening style",
  objectionHandling: "Objection handling",
  bestTimeToCall: "Best time to call",
};

export function prefLabel(k: string): string {
  return (PREF_LABELS as Record<string, string>)[k] ?? k;
}

export function displayPrefValue(k: string, v: string): string {
  if (k === "language") return `${languageName(v)} (${v})`;
  return v;
}

/** Human-readable Markdown twin of the JSON profile. Regenerated on every save. */
export function profileToMarkdown(p: SellerProfile): string {
  const L: string[] = [];
  L.push(`# Seller Profile — ${p.displayName}`);
  L.push("");
  if (p.isDemo) L.push("> **Synthetic demonstration data.** Not a real IndiaMART seller.\n");
  L.push(`| Field | Value |`, `|---|---|`);
  L.push(`| GLID | \`${p.glid}\` |`);
  if (p.contactPerson) L.push(`| Contact person | ${p.contactPerson} |`);
  L.push(`| Category | ${p.category} |`);
  if (p.city || p.state) L.push(`| Location | ${[p.city, p.state].filter(Boolean).join(", ")} |`);
  if (p.membership) L.push(`| Membership | ${p.membership} |`);
  const t = tenure(p.memberSince, p.glid);
  if (t) L.push(`| On IndiaMART for | ${t.en} (since ${p.memberSince ?? MEMBER_SINCE[p.glid]}) |`);
  L.push(`| TrustSEAL / GST | ${p.trustSeal ? "Yes" : "No"} / ${p.gstVerified ? "Verified" : "Not verified"} |`);
  L.push(`| PNS mapping | ${p.contact.pnsMapped ? `Mapped (${p.contact.pnsNumberMasked ?? "masked"})` : "Not mapped"} |`);
  L.push(`| Profile status | ${p.status} |`);
  L.push(`| Interactions | ${p.interactionCount} (last: ${p.lastInteractionAt ?? "never"}) |`);
  L.push(`| Created / Updated | ${p.createdAt} / ${p.updatedAt} |`);
  L.push("");
  L.push(`## Catalog (${p.catalog.length} products)`);
  L.push("");
  L.push(`| Offer ID | Product | Price | MOQ |`, `|---|---|---|---|`);
  for (const c of p.catalog) L.push(`| ${c.offerId} | ${c.name} | ${c.price != null ? `₹${c.price}/${c.unit ?? "unit"}` : "_missing_"} | ${c.moq ?? "-"} |`);
  L.push("");
  if (p.buyLeadInterests.length) {
    L.push(`## BuyLead interests`, "", ...p.buyLeadInterests.map((b) => `- ${b}`), "");
  }
  L.push(`## Communication persona`, "");
  for (const k of Object.keys(p.preferences) as PreferenceKey[]) {
    const f = p.preferences[k];
    L.push(`### ${prefLabel(k)}: **${displayPrefValue(k, f.value)}**`);
    L.push(`- Source: ${f.source} · Confidence: ${f.confidence} · Observations: ${f.observations}`);
    L.push(`- Reason: ${f.reason}`);
    for (const e of f.evidence.slice(-3)) L.push(`- Evidence (${e.at}${e.interactionId ? `, ${e.interactionId}` : ""}): ${e.note}${e.quote ? ` — “${e.quote}”` : ""}`);
    L.push("");
  }
  L.push(`## Behaviour`, "", p.behaviour.summary, "");
  for (const t of p.behaviour.traits) L.push(`- ${t}`);
  L.push("");
  L.push(`## What the seller has told us`, "");
  if (!p.memory.length) L.push("_Nothing recorded yet._");
  for (const m of p.memory) L.push(`- **[${m.category}]** ${m.fact}${m.quote ? ` — “${m.quote}”` : ""} _(${m.source}, ${m.at.slice(0, 10)}${m.interactionId ? `, ${m.interactionId}` : ""})_`);
  L.push("");
  L.push(`## Interaction history`, "");
  if (!p.history.length) L.push("_No calls yet._");
  for (const h of p.history) L.push(`- ${h.at} · ${h.interactionId} · ${h.mode} · ${h.outcome} · ${h.adaptations} adaptations · ${h.languagesUsed.map(languageName).join(", ")}`);
  L.push("");
  L.push(`## Profile change log`, "");
  for (const c of p.changeLog.slice(-25)) L.push(`- ${c.at} · **${prefLabel(c.field)}**: ${c.from} → ${c.to} (${c.source}) — ${c.reason}`);
  L.push("");
  return L.join("\n");
}
