"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, History, LayoutDashboard, Mic, Search, Settings, Users } from "lucide-react";

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
    <form onSubmit={submit} role="search" className={`group flex w-full items-center gap-2 transition-all duration-200 ${lg ? "rounded-2xl bg-white p-2 shadow-lg shadow-gray-900/5 ring-1 ring-gray-200 focus-within:shadow-xl focus-within:shadow-brand-600/10 focus-within:ring-2 focus-within:ring-brand-500/60" : ""}`}>
      <label htmlFor={`glid-${size}`} className="sr-only">Search seller by GLID</label>
      <div className="relative flex-1">
        <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-brand-600 ${lg ? "left-3.5 h-5 w-5" : "left-3 h-4 w-4"}`} aria-hidden />
        <input
          id={`glid-${size}`}
          value={v}
          onChange={(e) => setV(e.target.value)}
          autoFocus={autoFocus}
          inputMode="numeric"
          placeholder="Enter a GLID, e.g. 6601433"
          className={lg
            ? "w-full bg-transparent py-3 pl-11 pr-3 text-base font-medium outline-none placeholder:font-normal placeholder:text-gray-400"
            : "w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"}
        />
      </div>
      {lg && (
        <button type="submit" className="press inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-brand-600/30">
          Search <ArrowRight className="h-4 w-4 transition-transform group-focus-within:translate-x-0.5" aria-hidden />
        </button>
      )}
    </form>
  );
}

function SarvamStatus() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((c) => setOk(!!c?.voiceProvider?.configured)).catch(() => setOk(false));
  }, []);
  if (ok === null) return null;
  return (
    <Link href="/config" className="press flex items-center gap-2.5 rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 text-xs text-gray-600 transition hover:border-gray-300 hover:shadow-sm">
      <span className="relative flex h-2.5 w-2.5">
        {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      </span>
      <span className="leading-tight">
        <span className="block font-semibold text-gray-800">Sarvam AI</span>
        <span className="block text-[11px] text-gray-500">{ok ? "Voice connected" : "Not configured"}</span>
      </span>
    </Link>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="press group flex items-center gap-3">
      <span className={`relative grid place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-rose-800 text-white shadow-lg shadow-brand-600/30 transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105 ${compact ? "h-9 w-9" : "h-11 w-11"}`}>
        <Mic className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
      </span>
      <span className="leading-tight">
        <span className={`block font-extrabold tracking-tight text-gray-900 ${compact ? "text-base" : "text-[17px]"}`}>Persona Voice</span>
        <span className="block text-xs font-medium text-gray-500">IndiaMART seller agent</span>
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/sellers" && (path.startsWith("/call") || path.startsWith("/search"))));
  return (
    <div className="min-h-screen lg:pl-72">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-gray-200/70 bg-white/80 px-5 py-6 backdrop-blur-xl lg:flex">
        <Brand />
        <div className="mt-10 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Menu</div>
        <nav aria-label="Main" className="mt-3 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={`press group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-all duration-200 ${active
                  ? "bg-gradient-to-r from-brand-600 to-brand-500 font-semibold text-white shadow-md shadow-brand-600/25"
                  : "font-medium text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"}`}>
                <Icon className={`h-[18px] w-[18px] transition-transform duration-200 ${active ? "" : "group-hover:scale-110 group-hover:text-brand-600"}`} aria-hidden />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <SarvamStatus />
          <p className="px-1 text-[11px] leading-relaxed text-gray-400">IndiaMART · Voice AI Hackathon</p>
        </div>
      </aside>

      {/* Top bar (mobile / tablet only) */}
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/85 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3"><Brand compact /></div>
        <nav aria-label="Main (mobile)" className="flex gap-1.5 overflow-x-auto px-3 pb-2.5">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={`press whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${isActive(href) ? "bg-brand-600 font-semibold text-white shadow-sm" : "bg-gray-100 text-gray-600"}`}>{label}</Link>
          ))}
        </nav>
      </header>
      <main key={path} className="animate-fade-in mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
