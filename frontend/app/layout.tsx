import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ग्रामीण सहायक",
  description: "किसानों के लिए आसान आवाज़ आधारित कृषि सहायक",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
