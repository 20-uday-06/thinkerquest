import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/AppContext";
import LanguageToggle from "@/components/LanguageToggle";

export const metadata: Metadata = {
  title: "Grameen AI Sahayak | ग्रामीण एआई सहायक",
  description: "आपकी मदद के लिए तैयार - Voice-first AI assistant for rural India",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <head>
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Grameen AI" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>🌾</text></svg>" />
      </head>
      <body>
        <AppProvider>
          {children}
          <LanguageToggle />
        </AppProvider>
      </body>
    </html>
  );
}


