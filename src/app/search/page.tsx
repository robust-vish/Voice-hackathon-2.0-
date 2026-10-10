"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { GlidSearch } from "@/components/Shell";
import { SellerCard } from "@/components/SellerCard";
import { Button, Card, ErrorBox, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import type { SellerSummary } from "@/lib/summaries";

type State =
  | { kind: "idle" }
  | { kind: "loading"; glid: string }
  | { kind: "invalid"; message: string }
  | { kind: "notfound"; glid: string }
  | { kind: "error"; message: string }
  | { kind: "found"; summary: SellerSummary; initialised: boolean };

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const glid = params.get("glid") ?? "";
  const [state, setState] = useState<State>({ kind: "idle" });

  const run = (q: string) => {
    const g = q.trim();
    if (!g) return setState({ kind: "idle" });
    if (!/^[\d\s-]{4,16}$/.test(g)) return setState({ kind: "invalid", message: "A GLID is a number (4–12 digits), e.g. 6601433." });
    setState({ kind: "loading", glid: g });
    api<{ summary: SellerSummary; initialised: boolean }>(`/api/sellers/${encodeURIComponent(g)}`)
      .then((r) => setState({ kind: "found", summary: r.summary, initialised: r.initialised }))
      .catch((e: ApiError) => {
        if (e.status === 404) setState({ kind: "notfound", glid: g.toUpperCase() });
        else if (e.status === 400) setState({ kind: "invalid", message: e.message });
        else setState({ kind: "error", message: e.message });
      });
  };
  useEffect(() => run(glid), [glid]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-4 w-4" aria-hidden />Back</Button>
        <h1 className="text-2xl font-semibold tracking-tight">Find a seller</h1>
      </div>
      <Card>
        <GlidSearch size="lg" autoFocus key={glid} initial={glid} />
        <p className="mt-2 text-xs text-gray-500">Exact GLID match. Searches stored profiles and the seller registry.</p>
      </Card>

      {state.kind === "loading" && <Spinner label={`Looking up ${state.glid}…`} />}
      {state.kind === "invalid" && <ErrorBox message={state.message} />}
      {state.kind === "error" && <ErrorBox message={`Lookup failed: ${state.message}`} onRetry={() => run(glid)} />}
      {state.kind === "notfound" && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5">
          <SearchX className="h-6 w-6 text-gray-400" aria-hidden />
          <div>
            <div className="font-semibold">No seller found for <span className="font-mono">{state.glid}</span></div>
            <p className="text-sm text-gray-600">This GLID is not in the seller registry, so no profile was created. Check the GLID and try again.</p>
          </div>
        </div>
      )}
      {state.kind === "found" && (
        <div className="space-y-3">
          {state.initialised && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              This GLID exists in the seller registry but had no persona profile. A <strong>Provisional</strong> profile was initialised from registry metadata with safe defaults.
            </div>
          )}
          <SellerCard s={state.summary} detailed />
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SearchInner />
    </Suspense>
  );
}
