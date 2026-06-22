import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Histórico Musical do YouTube",
  description: "MVP local para acompanhar músicas ouvidas via YouTube."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
