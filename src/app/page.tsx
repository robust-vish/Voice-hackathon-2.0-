"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PhoneCall, Repeat2, UserCheck, Users } from "lucide-react";
import { GlidSearch } from "@/components/Shell";
import { SellerRow } from "@/components/SellerCard";
import { Card, Empty, ErrorBox, ModeBadge, Spinner, StatusBadge } from "@/components/ui";
import { api, fmtTime } from "@/lib/client";
import type { SellerSummary } from "@/lib/summaries";

interface Stats {
  totalSellers: number;
  completedInteractions: number;
  adaptationEvents: number;
  profilesUpdatedAfterCalls: number;
  recent: { id: string; glid: string; sellerName: string; mode: string; status: string; createdAt: string; outcome: string | null; adaptations: number }[];
}

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sellers, setSellers] = useState<SellerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    api<Stats>("/api/stats").then(setStats).catch((e) => setError(e.message));
    api<{ items: SellerSummary[] }>("/api/sellers?pageSize=6").then((r) => setSellers(r.items)).catch(() => setSellers([]));
  };
  useEffect(load, []);

  const tiles = stats
    ? [
        { label: "Sellers", value: stats.totalSellers, icon: Users },
        { label: "Calls completed", value: stats.completedInteractions, icon: PhoneCall },
        { label: "Adaptations", value: stats.adaptationEvents, icon: Repeat2 },
        { label: "Profiles updated", value: stats.profilesUpdatedAfterCalls, icon: UserCheck },
      ]
    : [];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Good to see you 👋</h1>
        <p className="mt-1 text-sm text-gray-500">Find a seller by GLID and start an adaptive voice call.</p>
        <div className="mt-5 max-w-2xl"><GlidSearch size="lg" /></div>
      </section>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!stats && !error && <Spinner />}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-4 w-4" aria-hidden /></span>
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Sellers" className="lg:col-span-3" padded={false} action={<Link href="/sellers" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>}>
          <div className="mt-2 divide-y divide-gray-100">
            {!sellers && <div className="p-5"><Spinner /></div>}
            {sellers?.map((s) => <SellerRow key={s.glid} s={s} compact />)}
          </div>
        </Card>

        <Card title="Recent calls" className="lg:col-span-2" padded={false} action={<Link href="/interactions" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">All calls <ArrowRight className="h-3 w-3" /></Link>}>
          <div className="mt-2 divide-y divide-gray-100">
            {stats && stats.recent.length === 0 && <div className="p-5"><Empty title="No calls yet">Pick a seller and press Call.</Empty></div>}
            {stats?.recent.slice(0, 5).map((r) => (
              <Link key={r.id} href={`/interactions/${r.id}`} className="block px-5 py-3 hover:bg-gray-50/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-gray-900">{r.sellerName}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                  <ModeBadge mode={r.mode} /><span>{fmtTime(r.createdAt)}</span><span>· {r.adaptations} adaptations</span>
                </div>
                {r.outcome && <div className="mt-1 truncate text-xs text-gray-600">{r.outcome}</div>}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
