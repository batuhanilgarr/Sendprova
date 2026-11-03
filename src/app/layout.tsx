import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "Sendprova", template: "%s · Sendprova" },
  description: "HTML mailing önizleme, kontrol ve test gönderimi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="h-12 shrink-0 border-b border-border bg-bg-elevated/80 backdrop-blur flex items-center px-4 gap-4 sticky top-0 z-20">
          <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
            <span className="inline-block size-5 rounded-md bg-accent" aria-hidden />
            Sendprova
          </Link>
          <span className="text-fg-subtle text-xs">v0.1 · yerel</span>
          <nav className="ml-auto flex items-center gap-1 text-fg-muted">
            <Link href="/settings" className="px-2 py-1 rounded-md hover:bg-bg-sunken hover:text-fg">
              Ayarlar
            </Link>
          </nav>
        </header>
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
      </body>
    </html>
  );
}
