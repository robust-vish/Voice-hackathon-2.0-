import fs from "node:fs";
import path from "node:path";
import { DEMO_REGISTRY, SEED_LEARNINGS, SEED_VERSION, SEEDED_PROFILE_GLIDS } from "./seed-data";
import { computeStatus, learnPreference, makeId, profileFromRegistry, profileToMarkdown } from "./profile";
import type { Interaction, RegistryEntry, SellerProfile } from "./types";

// File-based storage: one JSON + one Markdown file per seller (keyed by GLID),
// one JSON file per interaction.
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const SELLERS_DIR = path.join(DATA_DIR, "sellers");
const INTERACTIONS_DIR = path.join(DATA_DIR, "interactions");
const REGISTRY_FILE = path.join(DATA_DIR, "registry.json");
const METRICS_FILE = path.join(DATA_DIR, "metrics.json");

function writeJsonAtomic(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

const sellerJson = (glid: string) => path.join(SELLERS_DIR, `${glid}.json`);
const sellerMd = (glid: string) => path.join(SELLERS_DIR, `${glid}.md`);

let seeded = false;

export function ensureSeeded(force = false) {
  if (seeded && !force) return;
  if (!force && fs.existsSync(REGISTRY_FILE)) {
    // Re-seed automatically when the seller dataset changed (e.g. real sellers added).
    const current = readJson<{ seedVersion?: number }>(REGISTRY_FILE)?.seedVersion;
    if (current === SEED_VERSION) {
      seeded = true;
      syncIdentities();
      return;
    }
    force = true;
  }
  if (force) {
    fs.rmSync(SELLERS_DIR, { recursive: true, force: true });
    fs.rmSync(INTERACTIONS_DIR, { recursive: true, force: true });
    fs.rmSync(METRICS_FILE, { force: true });
  }
  fs.mkdirSync(SELLERS_DIR, { recursive: true });
  fs.mkdirSync(INTERACTIONS_DIR, { recursive: true });
  writeJsonAtomic(REGISTRY_FILE, { seedVersion: SEED_VERSION, note: "Seller registry (real sellers + synthetic demo sellers). Contains raw mobile numbers — keep private.", sellers: DEMO_REGISTRY });

  for (const glid of SEEDED_PROFILE_GLIDS) seedProfile(glid);
  seeded = true;
}

/** Writes the initial profile for a seeded seller (with synthetic prior-call learnings for demo sellers). */
function seedProfile(glid: string) {
  const base = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const entry = DEMO_REGISTRY.find((e) => e.glid === glid)!;
  const p = profileFromRegistry(entry, "New", new Date(base).toISOString());
  const seed = SEED_LEARNINGS[glid];
  if (seed) {
    for (let i = 0; i < seed.interactions; i++) {
      const at = new Date(base + (i + 1) * 1000 * 60 * 60 * 24 * 6).toISOString();
      const id = `SEED_INT_${glid.slice(-3)}_${i + 1}`;
      p.history.push({ interactionId: id, at, mode: "simulated", outcome: "Synthetic prior call (seed data)", adaptations: 1, languagesUsed: [p.preferences.language.value] });
      p.lastInteractionAt = at;
    }
    p.interactionCount = seed.interactions;
    for (const l of seed.learnings) {
      for (let k = 0; k < l.observations; k++) {
        const ref = p.history[Math.min(k, p.history.length - 1)];
        const r = learnPreference(p, { field: l.field, value: l.value, explicit: true, interactionId: ref.interactionId, note: l.note, quote: l.quote, at: ref.at });
        if (r.accepted && r.update.from !== r.update.to) {
          p.changeLog.push({ at: ref.at, interactionId: ref.interactionId, field: l.field, from: r.update.from, to: r.update.to, reason: l.note, source: "learned" });
        }
      }
    }
    for (const m of seed.memory) p.memory.push({ id: makeId("MEM"), at: p.lastInteractionAt!, category: m.category, fact: m.fact, source: "learned", interactionId: p.history[0].interactionId });
    p.behaviour = { summary: `Synthetic seed behaviour from ${seed.interactions} prior demo call(s).`, traits: seed.traits };
    p.status = computeStatus(p);
    p.updatedAt = p.lastInteractionAt!;
  }
  saveProfile(p, { keepUpdatedAt: true });
}

/**
 * Non-destructive update for corrected seller details (e.g. a name supplied later):
 * copies name/company from seed-data into the registry file and into profiles where the
 * name is still unknown — without wiping call history or learned preferences.
 */
function syncIdentities() {
  const reg = readJson<{ seedVersion: number; note?: string; sellers: RegistryEntry[] }>(REGISTRY_FILE);
  if (!reg) return;
  let regChanged = false;
  for (const seed of DEMO_REGISTRY) {
    const e = reg.sellers.find((x) => x.glid === seed.glid);
    if (!e) {
      // A seller added to seed-data later (e.g. more demo sellers): add it without touching anyone else.
      reg.sellers.push(seed);
      regChanged = true;
      if (!fs.existsSync(sellerJson(seed.glid))) seedProfile(seed.glid);
      continue;
    }
    for (const k of ["displayName", "contactPerson", "companyName"] as const) {
      if (seed[k] && e[k] !== seed[k]) { e[k] = seed[k]; regChanged = true; }
    }
    const p = readJson<SellerProfile>(sellerJson(seed.glid));
    if (!p) continue;
    const at = new Date().toISOString();
    let changed = false;
    if (seed.contactPerson && (!p.contactPerson || /^Unknown seller/i.test(p.displayName))) {
      p.changeLog.push({ at, field: "contactPerson", from: p.contactPerson ?? "unknown", to: seed.contactPerson, reason: "Seller name provided by the IndiaMART team.", source: "metadata" });
      p.contactPerson = seed.contactPerson;
      changed = true;
    }
    if (/^Unknown seller/i.test(p.displayName) && seed.displayName && !/^Unknown seller/i.test(seed.displayName)) { p.displayName = seed.displayName; changed = true; }
    if (seed.companyName && !p.companyName) { p.companyName = seed.companyName; changed = true; }
    // An earlier build could save the seller's own name as their company ("Shobhna of Shobhna").
    if (p.companyName && !seed.companyName && p.contactPerson && p.companyName.trim().toLowerCase() === p.contactPerson.trim().toLowerCase()) {
      p.changeLog.push({ at, field: "companyName", from: p.companyName, to: "unknown", reason: "Company name was just the seller's own name; cleared.", source: "metadata" });
      p.companyName = undefined;
      changed = true;
    }
    if (changed) saveProfile(p);
  }
  if (regChanged) writeJsonAtomic(REGISTRY_FILE, reg);
}

// ---------- Registry (stands in for the authorized IndiaMART seller registry) ----------

export function listRegistry(): RegistryEntry[] {
  ensureSeeded();
  return readJson<{ sellers: RegistryEntry[] }>(REGISTRY_FILE)?.sellers ?? [];
}

export function getRegistryEntry(glid: string): RegistryEntry | null {
  return listRegistry().find((e) => e.glid === glid) ?? null;
}

// ---------- Seller profiles ----------

export function getProfile(glid: string): SellerProfile | null {
  ensureSeeded();
  return readJson<SellerProfile>(sellerJson(glid));
}

export function saveProfile(p: SellerProfile, opts: { keepUpdatedAt?: boolean } = {}) {
  if (!opts.keepUpdatedAt) p.updatedAt = new Date().toISOString();
  writeJsonAtomic(sellerJson(p.glid), p);
  fs.writeFileSync(sellerMd(p.glid), profileToMarkdown(p), "utf8");
}

export function getProfileMarkdown(glid: string): string | null {
  const p = getProfile(glid);
  if (!p) return null;
  if (!fs.existsSync(sellerMd(glid))) fs.writeFileSync(sellerMd(glid), profileToMarkdown(p), "utf8");
  return fs.readFileSync(sellerMd(glid), "utf8");
}

export function listProfiles(): SellerProfile[] {
  ensureSeeded();
  if (!fs.existsSync(SELLERS_DIR)) return [];
  return fs
    .readdirSync(SELLERS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<SellerProfile>(path.join(SELLERS_DIR, f)))
    .filter((p): p is SellerProfile => !!p);
}

/**
 * Returns the stored profile; if the GLID only exists in the registry, initialises
 * a Provisional profile from registry metadata. Unknown GLIDs return null — we never
 * invent a seller.
 */
export function getOrInitProfile(glid: string): { profile: SellerProfile; initialised: boolean } | null {
  const existing = getProfile(glid);
  if (existing) return { profile: existing, initialised: false };
  const entry = getRegistryEntry(glid);
  if (!entry) return null;
  const p = profileFromRegistry(entry, "Provisional");
  saveProfile(p);
  return { profile: p, initialised: true };
}

// ---------- Interactions ----------

export function saveInteraction(i: Interaction) {
  writeJsonAtomic(path.join(INTERACTIONS_DIR, `${i.id}.json`), i);
}

export function getInteraction(id: string): Interaction | null {
  if (!/^[A-Z0-9_]+$/.test(id)) return null;
  return readJson<Interaction>(path.join(INTERACTIONS_DIR, `${id}.json`));
}

export function listInteractions(): Interaction[] {
  ensureSeeded();
  if (!fs.existsSync(INTERACTIONS_DIR)) return [];
  return fs
    .readdirSync(INTERACTIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Interaction>(path.join(INTERACTIONS_DIR, f)))
    .filter((i): i is Interaction => !!i)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- Metrics ----------

interface Metrics { personasGenerated: number }

export function getMetrics(): Metrics {
  return readJson<Metrics>(METRICS_FILE) ?? { personasGenerated: 0 };
}

export function bumpMetric(key: keyof Metrics, by = 1) {
  const m = getMetrics();
  m[key] += by;
  writeJsonAtomic(METRICS_FILE, m);
}
