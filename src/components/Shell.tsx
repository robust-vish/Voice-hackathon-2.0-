"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { History, LayoutDashboard, Mic, Search, Settings, Users } from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/sellers", label: "Sellers", icon: Users },
  { href: "/interactions", label: "Calls", icon: History },
  { href: "/config", label: "Settings", icon: Settings },
];

export function GlidSearch({ autoFocus = false, size = "sm", initial = "" }: { autoFocus?: boolean; size?: "sm" | "lg"; initial?: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = v.trim();
    router.push(q ? `/search?glid=${encodeURIComponent(q)}` : "/search");
  };
  const lg = size === "lg";
  return (
    <form onSubmit={submit} role="search" className="flex w-full gap-2">
      <label htmlFor={`glid-${size}`} className="sr-only">Search seller by GLID</label>
      <div className="relative flex-1">
        <Search className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${lg ? "h-5 w-5" : "h-4 w-4"}`} aria-hidden />
        <input
          id={`glid-${size}`}
          value={v}
          onChange={(e) => setV(e.target.value)}
          autoFocus={autoFocus}
          inputMode="numeric"
          placeholder={lg ? "Enter a GLID, e.g. 6601433" : "Search GLID…"}
          className={`w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${lg ? "py-3 text-base" : "py-2 text-sm"}`}
        />
      </div>
      {lg && <button type="submit" className="rounded-xl bg-brand-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-brand-700">Search</button>}
    </form>
  );
}

function SarvamPill() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((c) => setOk(!!c?.voiceProvider?.configured)).catch(() => setOk(false));
  }, []);
  if (ok === null) return null;
  return (
    <Link href="/config" className="hidden items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 sm:flex">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      Sarvam {ok ? "connected" : "not configured"}
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/sellers" && (path.startsWith("/call") || path.startsWith("/search"))));
  return (
    <div className="min-h-screen lg:pl-60">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-gray-200/70 bg-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm"><Mic className="h-4 w-4" aria-hidden /></span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-gray-900">Persona Voice Agent</span>
            <span className="block text-[11px] text-gray-500">IndiaMART · Voice AI Hackathon</span>
          </span>
        </Link>
        <nav aria-label="Main" className="mt-2 flex flex-col gap-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive(href) ? "bg-brand-50 font-semibold text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-5 text-[11px] leading-relaxed text-gray-400">Sellers are identified by GLID, BuyLeads by offer ID.</div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Mic className="h-4 w-4" aria-hidden /></span>
          </Link>
          <div className="w-full max-w-sm"><GlidSearch /></div>
          <div className="ml-auto"><SarvamPill /></div>
        </div>
        {/* Mobile nav */}
        <nav aria-label="Main (mobile)" className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${isActive(href) ? "bg-brand-50 font-semibold text-brand-700" : "text-gray-600"}`}>{label}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
