import { NextResponse } from "next/server";
import { CallError } from "./calls";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

export async function handle(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CallError) return fail(e.message, e.status, e.extra);
    console.error("[api]", e);
    return fail((e as Error).message || "Internal error", 500);
  }
}
