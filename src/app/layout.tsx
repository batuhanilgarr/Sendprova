import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { SettingsIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "Sendprova", template: "%s · Sendprova" },
  description: "HTML mailing önizleme, kontrol ve test gönderimi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <header className="h-12 shrink-0 border-b bg-background/80 backdrop-blur flex items-center px-3 sm:px-4 gap-3 sticky top-0 z-30">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="inline-grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold" aria-hidden>
                  S
                </span>
                Sendprova
              </Link>
              <span className="hidden sm:inline text-muted-foreground text-xs">v0.1 · yerel</span>
              <nav className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/settings" />}>
                  <SettingsIcon data-icon="inline-start" />
                  <span className="hidden sm:inline">Ayarlar</span>
                </Button>
                <ThemeToggle />
              </nav>
            </header>
            <main className="flex-1 flex flex-col min-h-0">{children}</main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
