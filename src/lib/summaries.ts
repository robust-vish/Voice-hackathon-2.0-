import { generatePersona } from "./persona";
import type { RegistryEntry, SellerProfile } from "./types";

export interface SellerSummary {
  glid: string;
  displayName: string;
  contactPerson?: string;
  category: string;
  city?: string;
  state?: string;
  membership?: string;
  preferredLanguage: string;
  personaSummary: string;
  status: SellerProfile["status"] | "Registry only";
  interactionCount: number;
  lastInteractionAt: string | null;
  updatedAt: string | null;
  catalogCount: number;
  pnsMapped: boolean;
  isDemo: boolean;
  hasProfile: boolean;
}

export function summarizeProfile(p: SellerProfile): SellerSummary {
  return {
    glid: p.glid, displayName: p.displayName, contactPerson: p.contactPerson, category: p.category, city: p.city, state: p.state,
    membership: p.membership, preferredLanguage: p.preferences.language.value, personaSummary: generatePersona(p).summary,
    status: p.status, interactionCount: p.interactionCount, lastInteractionAt: p.lastInteractionAt, updatedAt: p.updatedAt,
    catalogCount: p.catalog.length, pnsMapped: p.contact.pnsMapped, isDemo: p.isDemo, hasProfile: true,
  };
}

export function summarizeRegistry(e: RegistryEntry): SellerSummary {
  return {
    glid: e.glid, displayName: e.displayName, contactPerson: e.contactPerson, category: e.category, city: e.city, state: e.state,
    membership: e.membership, preferredLanguage: e.languageHint ?? "hi-IN", personaSummary: "No persona profile yet — opening this seller initialises a Provisional profile.",
    status: "Registry only", interactionCount: 0, lastInteractionAt: null, updatedAt: null,
    catalogCount: e.catalog.length, pnsMapped: e.pnsMapped, isDemo: e.glid.startsWith("DEMO_"), hasProfile: false,
  };
}
