import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Xieriee AI",
  description: "Advanced AI Chat Interface",
};

import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <AppProvider>
              <MainLayout>{children}</MainLayout>
            </AppProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
