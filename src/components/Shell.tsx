"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { History, LayoutDashboard, Mic, Search, Settings, Users } from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/search", label: "Search Seller", icon: Search },
  { href: "/sellers", label: "Seller Explorer", icon: Users },
  { href: "/interactions", label: "Call History", icon: History },
  { href: "/config", label: "Configuration", icon: Settings },
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
          placeholder="Search seller by GLID, e.g. DEMO_GLID_001"
          className={`w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${lg ? "py-3 text-base" : "py-1.5 text-sm"}`}
        />
      </div>
      <button type="submit" className={`rounded-lg bg-brand-600 font-medium text-white hover:bg-brand-700 ${lg ? "px-5 text-base" : "px-3 text-sm"}`}>Search</button>
    </form>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Mic className="h-4 w-4" aria-hidden /></span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-gray-900">Adaptive Persona Voice Agent</span>
              <span className="block text-[11px] font-medium text-brand-600">IndiaMART Voice AI Hackathon</span>
            </span>
          </Link>
          <div className="order-3 w-full md:order-2 md:ml-6 md:w-96">
            <GlidSearch />
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href) || (href === "/sellers" && path.startsWith("/call"));
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${active ? "border-brand-600 font-semibold text-brand-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
