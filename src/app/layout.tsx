import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

// Self-hosted at build time by next/font (no runtime request to Google).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Adaptive Persona Voice Agent",
  description: "Seller persona search, inspection and adaptive voice calling — IndiaMART Voice AI Hackathon demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
