import { generatePersona } from "./persona";
import { maskMobile } from "./profile";
import type { RegistryEntry, SellerProfile } from "./types";

export interface SellerSummary {
  glid: string;
  displayName: string;
  contactPerson?: string;
  companyName?: string;
  category: string;
  city?: string;
  state?: string;
  location?: string;
  mobileMasked?: string;
  membership?: string;
  preferredLanguage: string;
  personaSummary: string;
  status: SellerProfile["status"] | "Registry only";
  interactionCount: number;
  lastInteractionAt: string | null;
  updatedAt: string | null;
  catalogCount: number;
  leadCategories: string[];
  dealsIn: string[];
  pnsMapped: boolean;
  isDemo: boolean;
  hasProfile: boolean;
}

export function summarizeProfile(p: SellerProfile): SellerSummary {
  return {
    glid: p.glid, displayName: p.displayName, contactPerson: p.contactPerson, companyName: p.companyName, category: p.category,
    city: p.city, state: p.state, location: p.location ?? p.city, mobileMasked: p.contact.mobileMasked,
    membership: p.membership, preferredLanguage: p.preferences.language.value, personaSummary: generatePersona(p).summary,
    status: p.status, interactionCount: p.interactionCount, lastInteractionAt: p.lastInteractionAt, updatedAt: p.updatedAt,
    catalogCount: p.catalog.length, leadCategories: (p.leadCategories ?? []).map((c) => c.name), dealsIn: p.dealsIn ?? [],
    pnsMapped: p.contact.pnsMapped, isDemo: p.isDemo, hasProfile: true,
  };
}

// Never return a raw RegistryEntry from an API: it contains the unmasked mobile number.
export function summarizeRegistry(e: RegistryEntry): SellerSummary {
  return {
    glid: e.glid, displayName: e.displayName, contactPerson: e.contactPerson, companyName: e.companyName, category: e.category,
    city: e.city, state: e.state, location: e.location ?? e.city, mobileMasked: maskMobile(e.mobile),
    membership: e.membership, preferredLanguage: e.languageHint ?? "hi-IN", personaSummary: "No persona profile yet — opening this seller initialises a Provisional profile.",
    status: "Registry only", interactionCount: 0, lastInteractionAt: null, updatedAt: null,
    catalogCount: e.catalog.length, leadCategories: (e.leadCategories ?? []).map((c) => c.name), dealsIn: e.dealsIn ?? [],
    pnsMapped: e.pnsMapped, isDemo: e.isDemo, hasProfile: false,
  };
}
