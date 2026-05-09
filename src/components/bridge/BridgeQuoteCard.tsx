"use client";

import { BridgeRoute, formatBridgeTime } from "@/lib/bridge";
import { cn }                            from "@/lib/utils";

interface Props {
  route:      BridgeRoute;
  selected:   boolean;
  onSelect:   () => void;
}

export function BridgeQuoteCard({ route, selected, onSelect }: Props) {
  const receiveAmount = (
    Number(route.toAmount) / 1_000_000
  ).toFixed(2);

  const sendAmount = (
    Number(route.fromAmount) / 1_000_000
  ).toFixed(2);

  const totalFee = (
    parseFloat(route.gasCostUSD) +
    parseFloat(route.feeCostUSD)
  ).toFixed(2);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all",
        selected
          ? "border-purple-500 bg-purple-500/10"
          : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            selected ? "bg-purple-400" : "bg-gray-600"
          )} />
          <span className="text-sm font-medium text-white">
            {route.bridgeUsed}
          </span>
          {selected && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 
                           text-purple-300 rounded-full">
              Selected
            </span>
          )}
        </div>

        <span className="text-xs text-gray-400">
          {formatBridgeTime(route.estimatedTime)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className="flex-1 bg-gray-900 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-0.5">You send</p>
          <p className="font-semibold text-white">
            ${sendAmount} USDC
          </p>
          <p className="text-xs text-gray-500">{route.fromChainName}</p>
        </div>

        <div className="text-gray-600 text-lg">→</div>

        <div className="flex-1 bg-gray-900 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-0.5">You receive</p>
          <p className="font-semibold text-green-400">
            ${receiveAmount} USDC
          </p>
          <p className="text-xs text-gray-500">Solana</p>
        </div>
      </div>

      <div className="flex justify-between mt-3 text-xs text-gray-500">
        <span>Gas: ~${route.gasCostUSD}</span>
        <span>Fee: ~${route.feeCostUSD}</span>
        <span className="text-gray-400">
          Total cost: ~${totalFee}
        </span>
      </div>
    </button>
  );
}