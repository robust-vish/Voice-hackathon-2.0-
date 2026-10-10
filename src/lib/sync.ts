import fs from "node:fs";
import path from "node:path";

// Optional shared persistence for serverless hosts (Vercel, Netlify).
//
// There, every request can land on a different server instance, each with its own private /tmp,
// so a call started on one instance is "not found" on the next. When Upstash Redis credentials are
// set, each API request first pulls files other instances changed (hydrate) and, when it finishes,
// pushes the files it wrote (flush). The file store stays the source of truth inside a request;
// without credentials (localhost) this module does nothing.
//
// Redis layout: hash `va:files` (relative path -> JSON text), hash `va:stamps` (path -> version).

const URL_ = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
const FILES = "va:files";
const STAMPS = "va:stamps";
const BATCH = 25;

export const sharedStoreEnabled = () => !!(URL_ && TOKEN);

const dirty = new Set<string>(); // relative paths written by this instance, not yet pushed
const known = new Map<string, string>(); // relative path -> version this instance holds
let resetPending = false;
let root = "";

const rel = (abs: string) => path.relative(root, abs).split(path.sep).join("/");

async function redis(cmds: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((o) => {
    if (o.error) throw new Error(`Upstash: ${o.error}`);
    return o.result;
  });
}

/** Store calls this for every JSON file it writes. */
export function markDirty(absFile: string, dataDir: string) {
  if (!sharedStoreEnabled() || !absFile.endsWith(".json")) return;
  root = dataDir;
  dirty.add(rel(absFile));
}

/** Store calls this when the whole dataset is wiped and re-seeded. */
export function markReset() {
  if (!sharedStoreEnabled()) return;
  resetPending = true;
  dirty.clear();
  known.clear();
}

/** Pull every file another instance changed since this instance last saw it. */
export async function hydrate(dataDir: string) {
  if (!sharedStoreEnabled()) return;
  root = dataDir;
  const [flat] = (await redis([["HGETALL", STAMPS]])) as [string[] | null];
  const remote = new Map<string, string>();
  for (let i = 0; flat && i < flat.length; i += 2) remote.set(flat[i], flat[i + 1]);

  const changed = [...remote].filter(([f, v]) => known.get(f) !== v && !dirty.has(f)).map(([f]) => f);
  for (let i = 0; i < changed.length; i += BATCH) {
    const batch = changed.slice(i, i + BATCH);
    const [values] = (await redis([["HMGET", FILES, ...batch]])) as [(string | null)[]];
    batch.forEach((f, k) => {
      const text = values?.[k];
      if (text == null || f.includes("..")) return;
      const abs = path.join(dataDir, f);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text, "utf8");
      // A seller's Markdown is derived from its JSON: drop the stale copy so it is regenerated.
      if (f.startsWith("sellers/")) fs.rmSync(abs.replace(/\.json$/, ".md"), { force: true });
      known.set(f, remote.get(f)!);
    });
  }
  // Files another instance deleted (dataset reset).
  for (const f of [...known.keys()]) {
    if (!remote.has(f) && !dirty.has(f)) {
      fs.rmSync(path.join(dataDir, f), { force: true });
      known.delete(f);
    }
  }
}

/** Push the files this request wrote. */
export async function flush(dataDir: string) {
  if (!sharedStoreEnabled() || (!dirty.size && !resetPending)) return;
  root = dataDir;
  const cmds: (string | number)[][] = [];
  if (resetPending) cmds.push(["DEL", FILES, STAMPS]);
  for (const f of dirty) {
    const abs = path.join(dataDir, f);
    if (!fs.existsSync(abs)) {
      cmds.push(["HDEL", FILES, f], ["HDEL", STAMPS, f]);
      known.delete(f);
      continue;
    }
    const v = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    cmds.push(["HSET", FILES, f, fs.readFileSync(abs, "utf8")], ["HSET", STAMPS, f, v]);
    known.set(f, v);
  }
  dirty.clear();
  resetPending = false;
  if (cmds.length) await redis(cmds);
}
