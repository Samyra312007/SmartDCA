"use client";

import { useEffect, useState }  from "react";
import { useWallet }            from "@solana/wallet-adapter-react";
import { useAccount }           from "wagmi";
import { Card }                 from "@/components/ui/Card";
import { cn }                   from "@/lib/utils";

interface Props {
  strategyId:    string;
  targetAmount:  number;     
  onBridgeComplete: (amount: number, txHash: string) => void;
}

export function BridgeWidget({
  strategyId,
  targetAmount,
  onBridgeComplete,
}: Props) {
  const { publicKey: solanaWallet }  = useWallet();
  const { address: evmAddress }      = useAccount();

  const [WidgetComponent, setWidget] = useState<any>(null);
  const [widgetConfig, setConfig]    = useState<any>(null);

  useEffect(() => {
    import("@lifi/widget").then((module) => {
      setWidget(() => module.LiFiWidget);
    });
  }, []);

  useEffect(() => {
    if (!solanaWallet || !evmAddress) return;

    const config = {
      integrator:    "smartdca",
      variant:       "compact",
      appearance:    "dark",

      toChain:       1151111081099710, 
      toToken:       "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",

      toAddress:     solanaWallet.toString(),

      fromAmount:    targetAmount.toString(),

      chains: {
        from: {
          allow: [1, 8453, 42161, 137, 10], 
        },
        to: {
          allow: [1151111081099710], 
        },
      },

      theme: {
        palette: {
          primary:    { main: "#9945FF" },
          secondary:  { main: "#14F195" },
          background: { paper: "#1C1C1E", default: "#0A0A0B" },
          text:       { primary: "#FFFFFF", secondary: "#8E8E93" },
        },
        shape: { borderRadius: 12 },
      },

      fee: 0,

      slippage: 0.005,
    };

    setConfig(config);
  }, [solanaWallet, evmAddress, targetAmount]);

  if (!evmAddress && !solanaWallet) {
    return (
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <div className="text-4xl">🔗</div>
        <p className="text-gray-400 text-sm">
          Connect both your EVM wallet (MetaMask/Coinbase)
          and Solana wallet (Phantom) to bridge funds
        </p>
      </div>
    );
  }

  if (!evmAddress) {
    return (
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <div className="text-4xl">🦊</div>
        <p className="text-gray-400 text-sm">
          Connect your EVM wallet (MetaMask, Coinbase, etc.)
          to fund from Ethereum, Base, or Arbitrum
        </p>
      </div>
    );
  }

  if (!solanaWallet) {
    return (
      <div className="glass-card rounded-xl p-6 text-center space-y-3">
        <div className="text-4xl">👻</div>
        <p className="text-gray-400 text-sm">
          Connect your Solana wallet (Phantom, Backpack, etc.)
          to receive funds on Solana
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">
            Fund from Any Chain
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Powered by LI.FI — bridge from Ethereum, Base, Arbitrum + more
          </p>
        </div>
        <img
          src="https://li.fi/logo192.png"
          alt="LI.FI"
          className="h-6 w-6 rounded"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { name: "Ethereum", color: "#627EEA", emoji: "⟠" },
          { name: "Base",     color: "#0052FF", emoji: "🔵" },
          { name: "Arbitrum", color: "#28A0F0", emoji: "🔷" },
        ].map((chain) => (
          <div
            key={chain.name}
            className="glass-card rounded-lg p-2 text-center"
          >
            <span className="text-base">{chain.emoji}</span>
            <p className="text-gray-400 mt-1">{chain.name}</p>
          </div>
        ))}
      </div>

      <div className="text-center text-gray-600 text-xs">
        ↓ Bridge to Solana USDC ↓
      </div>

      <div className="rounded-xl overflow-hidden">
        {WidgetComponent && widgetConfig ? (
          <WidgetComponent
            config={widgetConfig}
            onRouteExecutionStarted={(route: any) => {
              const txHash = route?.steps?.[0]?.execution?.process?.[0]?.txHash;
              if (txHash) {
                onBridgeComplete(targetAmount, txHash);
              }
            }}
          />
        ) : (
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="animate-spin text-2xl mb-2">⟳</div>
            <p className="text-gray-400 text-sm">Loading bridge widget...</p>
          </div>
        )}
      </div>

      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Sending from</span>
          <span className="font-mono">
            {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)} (EVM)
          </span>
        </div>
        <div className="flex justify-between">
          <span>Arriving at</span>
          <span className="font-mono">
            {solanaWallet.toString().slice(0, 6)}...
            {solanaWallet.toString().slice(-4)} (Solana)
          </span>
        </div>
      </div>
    </div>
  );
}