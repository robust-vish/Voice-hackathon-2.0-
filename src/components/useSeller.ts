"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";
import type { SellerSummary } from "@/lib/summaries";
import type { ConversationPlan, Persona, PersonaDimensionKey, SellerProfile } from "@/lib/types";

export interface SellerResp {
  glid: string;
  initialised: boolean;
  summary: SellerSummary;
  profile: SellerProfile;
  persona: Persona;
  plan: ConversationPlan;
  activeInteraction: { id: string; status: string; overrides: Partial<Record<PersonaDimensionKey, string>>; currentPersona: Persona } | null;
}

/** Loads a seller. With `pollMs`, it also refreshes silently in the background (e.g. to follow a live call). */
export function useSeller(glid: string, pollMs?: number) {
  const [data, setData] = useState<SellerResp | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    return api<SellerResp>(`/api/sellers/${encodeURIComponent(glid)}`)
      .then((d) => { setData(d); return d; })
      .catch((e: ApiError) => { setError({ message: e.message, status: e.status }); return null; })
      .finally(() => setLoading(false));
  }, [glid]);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => {
      api<SellerResp>(`/api/sellers/${encodeURIComponent(glid)}`).then(setData).catch(() => {});
    }, pollMs);
    return () => clearInterval(id);
  }, [glid, pollMs]);

  return { data, error, loading, reload };
}
