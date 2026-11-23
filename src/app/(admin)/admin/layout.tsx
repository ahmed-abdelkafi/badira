import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import "@/styles/globals.css";

const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap" });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

/** The admin reads the session on every request. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · La Badira Admin" },
  robots: { index: false, follow: false, nocache: true },
  manifest: "/admin-manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#1C1C1C" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bodoni.variable} ${jost.variable}`} suppressHydrationWarning>
      <body className="admin min-h-dvh" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
