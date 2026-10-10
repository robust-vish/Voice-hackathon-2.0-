"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, PhoneCall, Repeat2, Sparkles, UserCheck, Users } from "lucide-react";
import { GlidSearch } from "@/components/Shell";
import { Badge, Card, DemoNotice, Empty, ErrorBox, ModeBadge, Spinner, StatusBadge } from "@/components/ui";
import { api, fmtTime } from "@/lib/client";

interface Stats {
  dataLabel: string;
  totalSellers: number;
  profiles: number;
  completedInteractions: number;
  personasGenerated: number;
  adaptationEvents: number;
  profilesUpdatedAfterCalls: number;
  sarvam: "configured" | "not-configured";
  operatingMode: string;
  recent: { id: string; glid: string; sellerName: string; mode: string; status: string; createdAt: string; outcome: string | null; adaptations: number; postCall: string }[];
}

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    api<Stats>("/api/stats").then(setStats).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const tiles = stats
    ? [
        { label: "Sellers in demo", value: stats.totalSellers, icon: Users, hint: `${stats.profiles} with persona profiles` },
        { label: "Completed interactions", value: stats.completedInteractions, icon: PhoneCall },
        { label: "Personas generated", value: stats.personasGenerated, icon: Sparkles },
        { label: "Adaptation events", value: stats.adaptationEvents, icon: Repeat2 },
        { label: "Profiles updated after calls", value: stats.profilesUpdatedAfterCalls, icon: UserCheck },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">Seller-adaptive voice agent</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Search a seller by GLID, inspect the persona learned from earlier conversations, and call them. The agent switches language, voice and style mid-call, and updates the seller&apos;s JSON + Markdown profile after every call.
        </p>
        <div className="mt-4 max-w-2xl"><GlidSearch size="lg" /></div>
        <p className="mt-2 text-xs text-gray-500">Try <Link className="font-mono text-brand-700 underline" href="/search?glid=DEMO_GLID_001">DEMO_GLID_001</Link>, <Link className="font-mono text-brand-700 underline" href="/search?glid=DEMO_GLID_003">DEMO_GLID_003</Link> or registry-only <Link className="font-mono text-brand-700 underline" href="/search?glid=DEMO_GLID_007">DEMO_GLID_007</Link>.</p>
      </section>

      <DemoNotice />
      {error && <ErrorBox message={error} onRetry={load} />}
      {!stats && !error && <Spinner />}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {tiles.map(({ label, value, icon: Icon, hint }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-medium text-gray-500">{label}<Icon className="h-4 w-4 text-brand-500" aria-hidden /></div>
                <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
                {hint && <div className="text-xs text-gray-500">{hint}</div>}
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="System status" className="lg:col-span-1">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><dt className="text-gray-600">Sarvam connection</dt><dd>{stats.sarvam === "configured" ? <Badge tone="green">API key configured</Badge> : <Badge tone="amber">Not configured</Badge>}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-gray-600">Operating mode</dt><dd className="text-right"><Badge tone={stats.sarvam === "configured" ? "blue" : "amber"}>{stats.operatingMode}</Badge></dd></div>
                <div className="flex items-center justify-between"><dt className="text-gray-600">Outbound PSTN</dt><dd><Badge>Not configured</Badge></dd></div>
              </dl>
              <Link href="/config" className="mt-4 inline-block text-xs font-medium text-brand-700 underline">View configuration</Link>
            </Card>

            <Card title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-brand-500" aria-hidden />Recent calls</span>} className="lg:col-span-2" action={<Link href="/interactions" className="text-xs font-medium text-brand-700 underline">All calls</Link>}>
              {stats.recent.length === 0 ? (
                <Empty title="No calls yet">Search a GLID and click <strong>Call Seller</strong> to run the first one.</Empty>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.recent.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                      <Link href={`/interactions/${r.id}`} className="font-mono text-xs text-brand-700 underline">{r.id}</Link>
                      <Link href={`/sellers/${r.glid}`} className="font-medium hover:underline">{r.sellerName}</Link>
                      <span className="font-mono text-xs text-gray-500">{r.glid}</span>
                      <ModeBadge mode={r.mode} />
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-gray-500">{r.adaptations} adaptations</span>
                      <span className="ml-auto text-xs text-gray-500">{fmtTime(r.createdAt)}</span>
                      {r.outcome && <span className="w-full text-xs text-gray-600">Outcome: {r.outcome}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
