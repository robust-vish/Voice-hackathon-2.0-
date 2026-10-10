import { fail, handle, json } from "@/lib/api";
import { ALLOWED_VALUES } from "@/lib/prefs-meta";
import { isValidGlid, normalizeGlid, nowIso } from "@/lib/profile";
import { getProfile, saveProfile } from "@/lib/store";
import type { PreferenceField, PreferenceKey } from "@/lib/types";

export const dynamic = "force-dynamic";

// Manual persona edits are validated and recorded as MANUAL overrides —
// never presented as something learned from conversations.
export async function PATCH(req: Request, { params }: { params: Promise<{ glid: string }> }) {
  return handle(async () => {
    const glid = normalizeGlid(decodeURIComponent((await params).glid));
    if (!isValidGlid(glid)) return fail("Invalid GLID", 400);
    const profile = getProfile(glid);
    if (!profile) return fail("Profile not found", 404);
    const body = (await req.json().catch(() => null)) as { field?: string; value?: string; note?: string } | null;
    const field = body?.field as PreferenceKey | undefined;
    const value = (body?.value ?? "").trim();
    const note = (body?.note ?? "").trim().slice(0, 200);
    if (!field || !(field in profile.preferences)) return fail("Unknown persona field", 400);
    if (!value) return fail("Value is required", 400);
    if (field === "bestTimeToCall") {
      if (value.length > 60) return fail("Best time to call must be at most 60 characters", 400);
    } else if (!(ALLOWED_VALUES[field] as readonly string[]).includes(value)) {
      return fail(`Invalid value for ${field}. Allowed: ${ALLOWED_VALUES[field].join(", ")}`, 400);
    }
    if (!note) return fail("A short reason is required for manual overrides", 400);

    const f = profile.preferences[field] as PreferenceField<string>;
    const from = f.value;
    const at = nowIso();
    f.value = value;
    f.source = "manual";
    f.confidence = 1;
    f.reason = `Manual override by operator: ${note}`;
    f.evidence = [...f.evidence, { at, note: `Manual override (${from} → ${value}): ${note}` }].slice(-10);
    f.updatedAt = at;
    profile.changeLog.push({ at, field, from, to: value, reason: `Manual override: ${note}`, source: "manual" });
    saveProfile(profile);
    return json({ ok: true, profile });
  });
}
