import type { Metadata } from "next";
import { GeistSans } from "@fontsource/geist/sans";
import { GeistMono } from "@fontsource/geist/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = {
  variable: "--font-geist-sans",
};

const geistMono = {
  variable: "--font-geist-mono",
};

export const metadata: Metadata = {
  title: "Wildlands Reborn - Voxel Survival",
  description: "Immersive 3D voxel survival game with dynamic lighting, crafting, exploration, and a living world.",
  keywords: ["voxel game", "survival", "crafting", "3D", "exploration", "wildlands"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
