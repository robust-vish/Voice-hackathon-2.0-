"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, PhoneCall, Repeat2, Sparkles, UserCheck, Users } from "lucide-react";
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

/** Animates a number from 0 to `value` (ease-out). */
function useCountUp(value: number, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setN(value);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return n;
}

const TILE_STYLES = [
  "from-rose-500 to-brand-600 shadow-brand-600/25",
  "from-emerald-500 to-teal-600 shadow-emerald-600/25",
  "from-violet-500 to-indigo-600 shadow-violet-600/25",
  "from-amber-400 to-orange-500 shadow-orange-500/25",
];

function StatTile({ label, value, suffix, hint, icon: Icon, i }: { label: string; value: number; suffix?: string; hint: string; icon: typeof Users; i: number }) {
  const n = useCountUp(value);
  return (
    <div className="lift animate-fade-up group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.05)]" style={{ animationDelay: `${120 + i * 70}ms` }}>
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl transition-transform duration-500 group-hover:scale-150 ${TILE_STYLES[i]}`} />
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${TILE_STYLES[i]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <div className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight text-gray-900">{n}{suffix && <span className="ml-1.5 text-2xl font-bold">{suffix}</span>}</div>
      <div className="mt-1 text-xs text-gray-400">{hint}</div>
    </div>
  );
}

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sellers, setSellers] = useState<SellerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");
  const load = () => {
    setError(null);
    api<Stats>("/api/stats").then(setStats).catch((e) => setError(e.message));
    api<{ items: SellerSummary[] }>("/api/sellers?pageSize=6").then((r) => setSellers(r.items)).catch(() => setSellers([]));
  };
  useEffect(load, []);
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const tiles = stats
    ? [
        { label: "Sellers", value: 2, suffix: "Lakh+", hint: "paid sellers on the IndiaMART platform", icon: Users },
        { label: "Calls completed", value: stats.completedInteractions, hint: "voice conversations", icon: PhoneCall },
        { label: "Adaptations", value: stats.adaptationEvents, hint: "live persona switches", icon: Repeat2 },
        { label: "Profiles updated", value: stats.profilesUpdatedAfterCalls, hint: "learned after calls", icon: UserCheck },
      ]
    : [];
  const quick = (sellers ?? []).filter((s) => !s.isDemo).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="animate-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-orange-500 px-6 py-10 text-white shadow-xl shadow-brand-700/20 sm:px-10 sm:py-12">
        <div className="animate-blob pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="animate-blob pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-orange-300/25 blur-3xl" style={{ animationDelay: "-4s" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur ring-1 ring-white/25">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Adaptive persona voice agent
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-[40px] sm:leading-[1.15]">{greeting} 👋</h1>
          <p className="mt-2 max-w-xl text-[15px] text-white/85">Find a seller by GLID and start a voice call that adapts to them — their language, voice and pace.</p>
          <div className="mt-7 max-w-2xl text-gray-900"><GlidSearch size="lg" /></div>
          {quick.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/70">Quick open:</span>
              {quick.map((s) => (
                <Link key={s.glid} href={`/sellers/${s.glid}`} className="press group inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-medium ring-1 ring-white/25 backdrop-blur transition hover:bg-white hover:text-brand-700">
                  {s.contactPerson ?? s.displayName} <span className="font-mono opacity-70">{s.glid}</span>
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!stats && !error && <Spinner />}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t, i) => <StatTile key={t.label} {...t} i={i} />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Sellers" className="lg:col-span-3" padded={false} action={<Link href="/sellers" className="press group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></Link>}>
          <div className="mt-2 divide-y divide-gray-100">
            {!sellers && <div className="p-5"><Spinner /></div>}
            {sellers?.map((s, i) => <div key={s.glid} className="animate-fade-up" style={{ animationDelay: `${200 + i * 50}ms` }}><SellerRow s={s} compact /></div>)}
          </div>
        </Card>

        <Card title="Recent calls" className="lg:col-span-2" padded={false} action={<Link href="/interactions" className="press group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">All calls <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></Link>}>
          <div className="mt-2 divide-y divide-gray-100">
            {stats && stats.recent.length === 0 && <div className="p-5"><Empty title="No calls yet">Pick a seller and press Call.</Empty></div>}
            {stats?.recent.slice(0, 5).map((r, i) => (
              <Link key={r.id} href={`/interactions/${r.id}`} className="animate-fade-up group block px-5 py-3.5 transition-colors hover:bg-gray-50/80" style={{ animationDelay: `${220 + i * 50}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-brand-700">{r.sellerName}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
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
