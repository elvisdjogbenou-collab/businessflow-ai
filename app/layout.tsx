import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusinessFlow AI",
  description: "Gestion mobile des prospects, clients, commandes, paiements et relances.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
