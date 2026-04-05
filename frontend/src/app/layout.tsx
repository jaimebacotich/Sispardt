import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { cn } from "@/lib/utils";

const inter = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SISPARDT",
    template: "%s — SISPARDT",
  },
  description:
    "Sistema de Partes Diarios — Dirección de Turismo, Gobierno Departamental de Tarija",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={cn(inter.variable)}>
      <body className="min-h-screen font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
