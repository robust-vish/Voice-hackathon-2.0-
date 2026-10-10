import { NextResponse } from "next/server";
import { CallError } from "./calls";
import { DATA_DIR } from "./store";
import { flush, hydrate } from "./sync";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

/**
 * Wraps every API route. With a shared store configured (serverless hosting), the request first
 * pulls what other instances changed and pushes its own writes before responding, so the next
 * request sees them whichever instance it lands on. `sync: false` skips this for routes that
 * don't touch seller data (speech-to-text, text-to-speech).
 */
export async function handle(fn: () => Promise<Response> | Response, { sync = true } = {}): Promise<Response> {
  try {
    if (sync) await hydrate(DATA_DIR);
    return await fn();
  } catch (e) {
    if (e instanceof CallError) return fail(e.message, e.status, e.extra);
    console.error("[api]", e);
    return fail((e as Error).message || "Internal error", 500);
  } finally {
    if (sync) await flush(DATA_DIR).catch((e) => console.error("[sync] flush failed:", (e as Error).message));
  }
}
