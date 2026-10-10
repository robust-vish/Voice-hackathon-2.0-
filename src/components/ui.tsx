"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, Inbox } from "lucide-react";
import { useState, type ReactNode } from "react";

export function Card({ children, className = "", title, action, padded = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; padded?: boolean }) {
  return (
    <section className={`rounded-2xl border border-gray-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700",
  red: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
};

export function Badge({ children, tone = "gray", className = "" }: { children: ReactNode; tone?: keyof typeof TONES | string; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone] ?? TONES.gray} ${className}`}>{children}</span>;
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Established" || status === "Completed" || status === "done" ? "green" :
    status === "Provisional" || status === "Preparing" || status === "Ending" || status === "processing" ? "amber" :
    status === "In Progress" || status === "Connected" || status === "Initiating" ? "blue" :
    status === "Failed" || status === "failed" ? "red" :
    status === "New" || status === "Registry only" ? "violet" : "gray";
  return <Badge tone={tone}>{status}</Badge>;
}

export function ModeBadge({ mode }: { mode: string }) {
  if (mode === "simulated") return <Badge tone="amber">Simulated</Badge>;
  if (mode === "web") return <Badge tone="blue">Web voice</Badge>;
  return <Badge tone="green">Phone</Badge>;
}

const AVATAR_COLORS = ["bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700"];

export function Avatar({ name, seed, size = "md" }: { name?: string; seed: string; size?: "sm" | "md" | "lg" }) {
  const initials = (name && !/^unknown/i.test(name) ? name : "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const color = AVATAR_COLORS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const sz = size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return <span className={`grid shrink-0 place-items-center rounded-full font-semibold ${color} ${sz}`} aria-hidden>{initials}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${value === t.id ? "border-brand-600 font-semibold text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          {t.label}{t.count != null && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function useTabs<T extends string>(initial: T) {
  return useState<T>(initial);
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="rounded-md bg-white px-2 py-1 text-xs font-medium ring-1 ring-brand-200 hover:bg-brand-100">Retry</button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
      <Inbox className="h-6 w-6 text-gray-300" aria-hidden />
      <div className="font-medium text-gray-700">{title}</div>
      {children}
    </div>
  );
}

type BtnProps = { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "ghost" | "danger"; className?: string; type?: "button" | "submit"; title?: string; "aria-label"?: string; size?: "sm" | "md" };

const VARIANTS = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-brand-200",
  secondary: "bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50 disabled:text-gray-400",
  ghost: "text-gray-600 hover:bg-gray-100 disabled:text-gray-300",
  danger: "bg-gray-900 text-white hover:bg-black disabled:bg-gray-300",
};

export function Button({ children, onClick, disabled, variant = "primary", className = "", type = "button", size = "md", ...rest }: BtnProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed ${size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "secondary", className = "", size = "md" }: { href: string; children: ReactNode; variant?: keyof typeof VARIANTS; className?: string; size?: "sm" | "md" }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition ${size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2" aria-label={`Confidence ${value}`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-gray-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500">{value.toFixed(2)}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
