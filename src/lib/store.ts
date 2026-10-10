import fs from "node:fs";
import path from "node:path";
import { DEMO_REGISTRY, SEED_LEARNINGS, SEEDED_PROFILE_GLIDS } from "./seed-data";
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
    seeded = true;
    return;
  }
  if (force) {
    fs.rmSync(SELLERS_DIR, { recursive: true, force: true });
    fs.rmSync(INTERACTIONS_DIR, { recursive: true, force: true });
    fs.rmSync(METRICS_FILE, { force: true });
  }
  fs.mkdirSync(SELLERS_DIR, { recursive: true });
  fs.mkdirSync(INTERACTIONS_DIR, { recursive: true });
  writeJsonAtomic(REGISTRY_FILE, { note: "Synthetic demo registry standing in for IndiaMART's authorized seller registry.", sellers: DEMO_REGISTRY });

  const base = Date.now() - 1000 * 60 * 60 * 24 * 30;
  for (const glid of SEEDED_PROFILE_GLIDS) {
    const entry = DEMO_REGISTRY.find((e) => e.glid === glid)!;
    const created = new Date(base).toISOString();
    const p = profileFromRegistry(entry, "New", created);
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
  seeded = true;
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
