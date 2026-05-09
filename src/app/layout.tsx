import type { Metadata }   from "next";
import { Inter }           from "next/font/google";
import "./globals.css";
import { Providers }       from "@/components/layout/Providers";
import { VoiceProvider }   from "@/components/voice/VoiceProvider";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#0A0A0B] text-white`}>
        <Providers>
          <VoiceProvider>
            {children}
          </VoiceProvider>
        </Providers>
      </body>
    </html>
  );
}