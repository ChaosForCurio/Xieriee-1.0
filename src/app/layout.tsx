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

import { Suspense } from "react";

import { Toaster } from "sonner";

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
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a] text-white">Loading...</div>}>
              <AppProvider>
                <MainLayout>{children}</MainLayout>
                <Toaster richColors position="top-center" theme="dark" />
              </AppProvider>
            </Suspense>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
