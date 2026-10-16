import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/tokens.css";
import { AuthProvider } from "@/lib/authContext";
import { I18nProvider } from "@/lib/i18nContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chrono - Enterprise Management System",
  description: "ERP, Inventory Management, POS, and Operations System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
