"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, DemoNotice, Empty, ErrorBox, ModeBadge, Spinner, StatusBadge } from "@/components/ui";
import { api, fmtDuration, fmtTime } from "@/lib/client";

interface Row {
  id: string; glid: string; sellerName: string; mode: string; status: string; createdAt: string; durationSec: number | null;
  initialPersona: string; outcome: string | null; adaptations: number; postCall: string; profileUpdates: number;
}

export default function InteractionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [glid, setGlid] = useState("");
  const load = () => {
    setError(null);
    api<{ items: Row[] }>(`/api/interactions${glid.trim() ? `?glid=${encodeURIComponent(glid.trim())}` : ""}`).then((r) => setRows(r.items)).catch((e) => setError(e.message));
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [glid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Call History</h1>
      <DemoNotice />
      <label className="flex max-w-xs flex-col text-xs text-gray-600">Filter by GLID
        <input value={glid} onChange={(e) => setGlid(e.target.value)} placeholder="DEMO_GLID_001" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <Empty title="No interactions recorded yet" />}
      {rows && rows.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr><th className="py-2 pr-3">Interaction</th><th className="pr-3">GLID / Seller</th><th className="pr-3">When</th><th className="pr-3">Mode</th><th className="pr-3">Status</th><th className="pr-3">Duration</th><th className="pr-3">Initial persona</th><th className="pr-3">Outcome</th><th className="pr-3">Adapt.</th><th>Profile update</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-gray-50">
                    <td className="py-2 pr-3"><Link className="font-mono text-xs text-brand-700 underline" href={`/interactions/${r.id}`}>{r.id}</Link></td>
                    <td className="pr-3"><Link className="font-mono text-xs hover:underline" href={`/sellers/${r.glid}`}>{r.glid}</Link><div className="text-xs text-gray-600">{r.sellerName}</div></td>
                    <td className="whitespace-nowrap pr-3 text-xs">{fmtTime(r.createdAt)}</td>
                    <td className="pr-3"><ModeBadge mode={r.mode} /></td>
                    <td className="pr-3"><StatusBadge status={r.status} /></td>
                    <td className="pr-3 text-xs">{fmtDuration(r.durationSec)}</td>
                    <td className="max-w-[220px] pr-3 text-xs text-gray-600">{r.initialPersona}</td>
                    <td className="max-w-[180px] pr-3 text-xs">{r.outcome ?? "—"}</td>
                    <td className="pr-3 text-center">{r.adaptations}</td>
                    <td><StatusBadge status={r.postCall} />{r.postCall === "done" && <div className="text-xs text-gray-500">{r.profileUpdates} change(s)</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
