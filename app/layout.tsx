import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- CONFIGURAÇÕES DO APLICATIVO (PWA) ---
export const metadata: Metadata = {
  title: "Gestão CSIPRC",
  description: "Sistema de Gestão de Diárias e Viagens",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon.png", // Ícone para iPhone/iPad
  },
  appleWebApp: {
    capable: true,
    title: "CSIPRC",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a", // Cor da barra do topo no celular
};
// -----------------------------------------

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}