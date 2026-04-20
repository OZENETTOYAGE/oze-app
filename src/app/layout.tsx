import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OZÉ Nettoyage",
  description: "Gestion des interventions et chantiers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "DM Sans, sans-serif" }}>{children}</body>
    </html>
  );
}
