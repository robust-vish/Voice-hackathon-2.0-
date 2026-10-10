"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, Empty, ErrorBox, ModeBadge, PageHeader, Spinner, StatusBadge } from "@/components/ui";
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
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [glid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader title="Calls" subtitle="Every call, its outcome and how the agent adapted." />
      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input aria-label="Filter by GLID" value={glid} onChange={(e) => setGlid(e.target.value)} placeholder="Filter by GLID" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500" />
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <Empty title="No calls yet" />}
      {rows && rows.length > 0 && (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                <tr><th className="px-5 py-2.5">Seller</th><th className="pr-4">When</th><th className="pr-4">Mode</th><th className="pr-4">Status</th><th className="pr-4">Outcome</th><th className="pr-4 text-right">Adapt.</th><th className="pr-5 text-right">Duration</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-middle hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <Link href={`/interactions/${r.id}`} className="font-medium text-gray-900 hover:underline">{r.sellerName}</Link>
                      <div className="font-mono text-xs text-gray-400">{r.glid}</div>
                    </td>
                    <td className="whitespace-nowrap pr-4 text-xs text-gray-500">{fmtTime(r.createdAt)}</td>
                    <td className="pr-4"><ModeBadge mode={r.mode} /></td>
                    <td className="pr-4"><StatusBadge status={r.status} /></td>
                    <td className="max-w-[280px] truncate pr-4 text-xs text-gray-600">{r.outcome ?? "—"}</td>
                    <td className="pr-4 text-right tabular-nums">{r.adaptations}</td>
                    <td className="pr-5 text-right text-xs text-gray-500">{fmtDuration(r.durationSec)}</td>
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
