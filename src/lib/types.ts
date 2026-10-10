// Shared domain types for the Adaptive Persona voice agent.
// GLID (IndiaMART Global Login ID) is the primary identity key everywhere.

export const PROFILE_SCHEMA_VERSION = 1;

export type LanguageCode =
  | "en-IN" | "hi-IN" | "bn-IN" | "ta-IN" | "te-IN" | "gu-IN"
  | "kn-IN" | "ml-IN" | "mr-IN" | "pa-IN" | "od-IN";

export type VoiceGender = "female" | "male";
export type ProfileStatus = "New" | "Provisional" | "Established";
export type PreferenceSource = "default" | "metadata" | "learned" | "manual";

export interface Evidence {
  interactionId?: string;
  at: string;
  note: string;
  quote?: string;
}

export interface PreferenceField<T extends string = string> {
  value: T;
  source: PreferenceSource;
  confidence: number; // 0..1
  observations: number; // observations supporting the current value
  tally: Record<string, number>; // observations per candidate value
  reason: string;
  evidence: Evidence[];
  updatedAt: string;
}

export type LanguageStyle = "native" | "code-mixed" | "english-heavy";
export type Tone = "warm" | "professional" | "direct" | "empathetic";
export type Formality = "formal" | "informal";
export type Pace = "slow" | "normal" | "fast";
export type ResponseLength = "concise" | "balanced" | "detailed";
export type ExplanationDetail = "low" | "medium" | "high";
export type OpeningStyle = "direct" | "greeting-first" | "relationship";
export type ObjectionHandling = "acknowledge-and-reassure" | "data-backed" | "brief-and-move-on";

export interface Preferences {
  language: PreferenceField<LanguageCode>;
  languageStyle: PreferenceField<LanguageStyle>;
  voiceGender: PreferenceField<VoiceGender>;
  tone: PreferenceField<Tone>;
  formality: PreferenceField<Formality>;
  pace: PreferenceField<Pace>;
  responseLength: PreferenceField<ResponseLength>;
  explanationDetail: PreferenceField<ExplanationDetail>;
  openingStyle: PreferenceField<OpeningStyle>;
  objectionHandling: PreferenceField<ObjectionHandling>;
  bestTimeToCall: PreferenceField<string>;
}

export type PreferenceKey = keyof Preferences;

export interface CatalogItem {
  productId: number; // catalog product id (BuyLeads are identified separately, by offer id)
  name: string;
  price?: number | null;
  unit?: string;
  moq?: string;
  specs?: Record<string, string>;
}

export type MemoryCategory = "business" | "product" | "pricing" | "availability" | "preference" | "complaint" | "other";

export interface MemoryNote {
  id: string;
  at: string;
  interactionId?: string;
  category: MemoryCategory;
  fact: string;
  quote?: string;
  source: "learned" | "manual" | "metadata";
}

export interface ProfileChange {
  at: string;
  interactionId?: string;
  field: string;
  from: string;
  to: string;
  reason: string;
  source: PreferenceSource;
}

export interface InteractionRef {
  interactionId: string;
  at: string;
  mode: CallMode;
  outcome: string;
  adaptations: number;
  languagesUsed: LanguageCode[];
}

export interface SellerProfile {
  schemaVersion: number;
  glid: string;
  isDemo: boolean;
  displayName: string;
  contactPerson?: string;
  companyName?: string;
  category: string;
  subCategories?: string[];
  city?: string;
  state?: string;
  membership?: string;
  trustSeal?: boolean;
  gstVerified?: boolean;
  yearEstablished?: number;
  memberSince?: string; // "YYYY-MM" — when the seller joined IndiaMART
  secondaryLanguage?: LanguageCode;
  location?: string;
  contact: {
    pnsMapped: boolean; // Preferred Number Service virtual number mapped
    pnsNumberMasked?: string;
    mobileMasked?: string; // raw mobile never leaves the registry file
    registeredNumbers: number;
  };
  catalog: CatalogItem[];
  buyLeadInterests: string[];
  dealsIn: string[];
  leadCategories: LeadCategory[];
  buyLeads: BuyLead[];
  preferences: Preferences;
  /** Voice the seller settled on per gender after asking for a different voice (Bulbul speaker id). */
  preferredSpeakers?: Partial<Record<VoiceGender, string>>;
  behaviour: { summary: string; traits: string[] };
  memory: MemoryNote[];
  status: ProfileStatus;
  interactionCount: number;
  lastInteractionAt: string | null;
  createdAt: string;
  updatedAt: string;
  history: InteractionRef[];
  changeLog: ProfileChange[];
}

/** Metadata available from the (demo) authorized seller registry. */
/** A BuyLead category (MCAT) the seller consumes leads from. */
export interface LeadCategory {
  mcatId: number;
  name: string;
  count: number; // raw value from the source data (index 0), stored as-is
  grade: string; // raw value from the source data (index 2), stored as-is
}

/** A BuyLead is identified by its numeric offer id; once consumed it expires. */
export interface BuyLead {
  offerId: number;
  title: string;
  mcatId?: number;
  status: "active" | "consumed" | "expired";
  consumedAt?: string;
}

export interface RegistryEntry {
  glid: string; // numeric GLID as a string
  isDemo: boolean;
  mobile?: string; // raw number: registry file only, never copied into profiles / API / LLM
  location?: string;
  dealsIn?: string[];
  leadCategories?: LeadCategory[];
  buyLeads?: BuyLead[];
  displayName: string;
  contactPerson?: string;
  companyName?: string;
  category: string;
  subCategories?: string[];
  city?: string;
  state?: string;
  membership?: string;
  trustSeal?: boolean;
  gstVerified?: boolean;
  yearEstablished?: number;
  memberSince?: string;
  languageHint?: LanguageCode;
  secondaryLanguage?: LanguageCode;
  pnsMapped: boolean;
  pnsNumberMasked?: string;
  registeredNumbers: number;
  catalog: CatalogItem[];
  buyLeadInterests?: string[];
}

// ---------- Persona ----------

export interface PersonaDimension<T extends string = string> {
  value: T;
  reason: string;
  evidenceCount: number;
  confidence: number;
  source: PreferenceSource | "call-override";
}

export interface Persona {
  glid: string;
  generatedAt: string;
  agentName: string;
  voiceSpeaker: string;
  language: PersonaDimension<LanguageCode>;
  languageStyle: PersonaDimension<LanguageStyle>;
  voiceGender: PersonaDimension<VoiceGender>;
  tone: PersonaDimension<Tone>;
  formality: PersonaDimension<Formality>;
  pace: PersonaDimension<Pace>;
  responseLength: PersonaDimension<ResponseLength>;
  explanationDetail: PersonaDimension<ExplanationDetail>;
  openingStyle: PersonaDimension<OpeningStyle>;
  objectionHandling: PersonaDimension<ObjectionHandling>;
  summary: string;
}

export type PersonaDimensionKey = Exclude<keyof Persona, "glid" | "generatedAt" | "agentName" | "voiceSpeaker" | "summary">;

export interface PlanStep {
  id: string;
  title: string;
  goal: string;
}

export interface ConversationPlan {
  objective: string;
  steps: PlanStep[];
  talkingPoints: string[];
  avoid: string[];
}

// ---------- Calls / interactions ----------

export type CallMode = "simulated" | "web" | "pstn";

/** Call script: identity → feedback → resolve/escalate → meeting → paid benefits → catalog → open chat. */
export const CALL_STAGES = ["identity", "feedback", "resolve", "meeting", "pitch", "catalog", "open"] as const;
export type CallStage = (typeof CALL_STAGES)[number];

export type CallStatus =
  | "Preparing" | "Initiating" | "Ringing" | "Connected" | "In Progress"
  | "Ending" | "Completed" | "Failed" | "Cancelled";

export type SignalType =
  | "language_switch" | "voice_gender" | "shorter" | "more_detail" | "slower" | "faster"
  | "formal" | "informal" | "busy" | "callback_time" | "frustration" | "not_interested" | "end_call"
  | "hurry" | "off_topic" | "issue" | "urgent" | "profile_query" | "voice_change";

export interface Signal {
  type: SignalType;
  label: string;
  quote: string;
  value?: string;
  explicit: boolean; // seller asked for it directly vs. inferred
  persistentCandidate: boolean; // may become a long-term preference after validation
  confidence: number;
}

export interface Turn {
  id: string;
  at: string;
  speaker: "agent" | "seller" | "system";
  text: string;
  language: LanguageCode;
  voice?: { gender: VoiceGender; speaker: string };
  signals?: SignalType[];
  translatedFrom?: string;
}

export interface SwitchLogEntry {
  id: string;
  at: string;
  turnId: string;
  signalType: SignalType;
  signal: string;
  quote: string;
  dimension: PersonaDimensionKey | "plan" | "voice";
  previous: string;
  next: string;
  reason: string;
  scope: "temporary" | "persistent-candidate";
}

export interface PrecallCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface ProfileUpdate {
  field: string;
  from: string;
  to: string;
  reason: string;
}

export interface PostCallSummary {
  interactionId: string;
  durationSec: number | null;
  outcome: string;
  initialPersonaSummary: string;
  adaptations: number;
  observations: string[];
  updates: ProfileUpdate[];
  rejected: ProfileUpdate[];
  memoryAdded: string[];
  profileUpdatedAt: string;
}

export interface Interaction {
  id: string;
  glid: string;
  sellerName: string;
  mode: CallMode;
  provider: string;
  providerCallId?: string;
  status: CallStatus;
  statusHistory: { status: CallStatus; at: string; note?: string }[];
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  checks: PrecallCheck[];
  profileVersionAt: string; // profile.updatedAt that the persona was generated from
  initialPersona: Persona;
  currentPersona: Persona;
  overrides: Partial<Record<PersonaDimensionKey, string>>;
  plan: ConversationPlan;
  planStep: number;
  beat: number; // next conversational beat the agent will deliver
  stage?: CallStage; // where the conversation is in the call script
  stagesVisited?: CallStage[];
  explicitLanguage?: boolean; // seller explicitly chose a language this call (beats implicit mirroring)
  rejectedSpeakers?: string[]; // voices the seller asked to replace this call (never offered again)
  issues?: { at: string; turnId: string; issue: string }[];
  escalations?: { at: string; turnId: string; issue: string }[];
  meetingTime?: string;
  statedName?: string; // name the seller told us on this call
  statedCompany?: string; // company the seller told us on this call
  agentEnded?: boolean; // agent delivered its closing line
  engineNotes: string[];
  turns: Turn[];
  switchLog: SwitchLogEntry[];
  signals: (Signal & { turnId: string; at: string })[];
  lastSignal?: Signal;
  outcome?: string;
  callbackRequested?: string;
  scenarioCursor?: number;
  postCall: {
    status: "not-started" | "processing" | "done" | "failed";
    error?: string;
    summary?: PostCallSummary;
    attempts: number;
  };
}

export interface AgentReply {
  text: string;
  language: LanguageCode;
  voice: { gender: VoiceGender; speaker: string };
  engine: "llm" | "template";
  endCall?: boolean;
}
