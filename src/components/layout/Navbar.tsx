"use client";

import Link                      from "next/link";
import { usePathname }           from "next/navigation";
import { ConnectButton }         from "@rainbow-me/rainbowkit";
import { WalletMultiButton }     from "@solana/wallet-adapter-react-ui";
import { useWallet }             from "@solana/wallet-adapter-react";
import { useAccount }            from "wagmi";
import { cn, formatAddress }     from "@/lib/utils";
import { Separator }             from "@/components/ui/separator";

const NAV_LINKS = [
  { href: "/",          label: "Home"      },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/create",    label: "Create"    },
];

export function Navbar() {
  const pathname                  = usePathname();
  const { publicKey }             = useWallet();
  const { address: evmAddress }   = useAccount();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">

        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="size-9 rounded-xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center shadow-lg shadow-solana-purple/20">
            <span className="text-sm font-bold text-black">S</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground hidden sm:block">
            Smart<span className="gradient-text">DCA</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 bg-muted/30 p-1 rounded-2xl border border-border/50">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200",
                pathname === link.href
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-8 w-px bg-border/50 hidden sm:block" />
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {(evmAddress || publicKey) && (
        <div className="border-t border-border/30 bg-muted/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 h-8 flex items-center gap-6 overflow-x-auto no-scrollbar">
            {evmAddress && (
              <div className="flex items-center gap-2 text-[10px] font-mono font-medium text-muted-foreground whitespace-nowrap">
                <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="uppercase tracking-wider opacity-60">EVM:</span>
                <span className="text-foreground">{formatAddress(evmAddress)}</span>
              </div>
            )}
            {publicKey && (
              <div className="flex items-center gap-2 text-[10px] font-mono font-medium text-muted-foreground whitespace-nowrap">
                <span className="size-1.5 rounded-full bg-solana-purple animate-pulse" />
                <span className="uppercase tracking-wider opacity-60">Solana:</span>
                <span className="text-foreground">{formatAddress(publicKey.toString())}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}