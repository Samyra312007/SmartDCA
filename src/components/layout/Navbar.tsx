"use client";

import Link                      from "next/link";
import { usePathname }           from "next/navigation";
import { ConnectButton }         from "@rainbow-me/rainbowkit";
import { WalletMultiButton }     from "@solana/wallet-adapter-react-ui";
import { useWallet }             from "@solana/wallet-adapter-react";
import { useAccount }            from "wagmi";
import { cn, formatAddress }     from "@/lib/utils";

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
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-green-400 flex items-center justify-center">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="font-bold text-white hidden sm:block">
            Smart<span className="gradient-text">DCA</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">

          <div className="hidden sm:block">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          </div>

          <WalletMultiButton
            style={{
              background:   "linear-gradient(135deg, #9945FF20, #14F19520)",
              border:       "1px solid rgba(153, 69, 255, 0.3)",
              borderRadius: "12px",
              color:        "#fff",
              fontSize:     "13px",
              height:       "40px",
              padding:      "0 16px",
            }}
          />
        </div>
      </div>

      {(evmAddress || publicKey) && (
        <div className="border-t border-white/5 bg-black/60">
          <div className="max-w-7xl mx-auto px-6 h-8 flex items-center gap-4">
            {evmAddress && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>EVM: {formatAddress(evmAddress)}</span>
              </div>
            )}
            {publicKey && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Solana: {formatAddress(publicKey.toString())}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}