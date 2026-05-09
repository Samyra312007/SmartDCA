import type { Metadata }   from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers }       from "@/components/layout/Providers";
import { VoiceProvider }   from "@/components/voice/VoiceProvider";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:       "SmartDCA — Conditional DCA on Solana",
  description: "Set conditions, fund from any chain, execute automatically on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans bg-background text-foreground antialiased`}>
        <Providers>
          <VoiceProvider>
            {children}
          </VoiceProvider>
        </Providers>
      </body>
    </html>
  );
}