import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "QuoteSys — Sistema de Cotizaciones Corporativo",
  description: "Plataforma empresarial de gestión de cotizaciones y catálogo de productos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
