"use client";

import { useEffect, useState } from "react";
import { BridgeStatus }        from "@/lib/bridge";
import { cn }                  from "@/lib/utils";

interface Props {
  txHash:    string;
  fromChain: string;
  onComplete?: (solanaTx: string) => void;
}

type Step = {
  label:   string;
  status:  "pending" | "active" | "done" | "error";
};

export function BridgeStatusTracker({ txHash, fromChain, onComplete }: Props) {
  const [status, setStatus]   = useState<BridgeStatus | null>(null);
  const [steps, setSteps]     = useState<Step[]>([
    { label: "Transaction submitted",  status: "done"    },
    { label: "Confirming on source",   status: "active"  },
    { label: "Bridging cross-chain",   status: "pending" },
    { label: "Arriving on Solana",     status: "pending" },
    { label: "Ready to use",           status: "pending" },
  ]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      try {
        const res  = await fetch(
          `/api/bridge?action=status&txHash=${txHash}&fromChain=${fromChain}`
        );
        const data = await res.json();
        const s    = data.status as BridgeStatus;

        if (cancelled) return;

        setStatus(s);

        if (s.status === "pending") {
          setSteps([
            { label: "Transaction submitted",  status: "done"   },
            { label: "Confirming on source",   status: "active" },
            { label: "Bridging cross-chain",   status: "pending"},
            { label: "Arriving on Solana",     status: "pending"},
            { label: "Ready to use",           status: "pending"},
          ]);
        } else if (s.status === "done") {
          setSteps([
            { label: "Transaction submitted",  status: "done" },
            { label: "Confirming on source",   status: "done" },
            { label: "Bridging cross-chain",   status: "done" },
            { label: "Arriving on Solana",     status: "done" },
            { label: "Ready to use",           status: "done" },
          ]);
          onComplete?.(s.receiving?.txHash ?? "");
          return; 
        } else if (s.status === "failed") {
          setSteps((prev) =>
            prev.map((step) =>
              step.status === "active"
                ? { ...step, status: "error" }
                : step
            )
          );
          return;
        }

        setTimeout(poll, 5000);
      } catch {
        if (!cancelled) setTimeout(poll, 5000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [txHash, fromChain]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          Bridge in Progress
        </h3>
        <span className="text-sm text-gray-400">
          {formatTime(elapsed)}
        </span>
      </div>

      <div className="bg-gray-900 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Transaction</p>
        <p className="text-xs font-mono text-gray-300 break-all">
          {txHash}
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0",
              step.status === "done"    && "bg-green-500/20 text-green-400",
              step.status === "active"  && "bg-purple-500/20 text-purple-400",
              step.status === "pending" && "bg-gray-700 text-gray-500",
              step.status === "error"   && "bg-red-500/20 text-red-400",
            )}>
              {step.status === "done"    && "✓"}
              {step.status === "active"  && (
                <span className="animate-spin">⟳</span>
              )}
              {step.status === "pending" && "○"}
              {step.status === "error"   && "✗"}
            </div>

            <span className={cn(
              "text-sm",
              step.status === "done"    && "text-green-400",
              step.status === "active"  && "text-purple-300",
              step.status === "pending" && "text-gray-500",
              step.status === "error"   && "text-red-400",
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {status?.status === "pending" && (
        <p className="text-xs text-gray-500 text-center">
          Cross-chain bridges typically take 1-5 minutes
        </p>
      )}

      {status?.status === "done" && status.receiving && (
        <div className="bg-green-500/10 border border-green-500/20 
                       rounded-lg p-3 space-y-1">
          <p className="text-green-400 text-sm font-medium">
            ✅ Bridge complete!
          </p>
          <p className="text-xs text-gray-400">
            {(Number(status.receiving.amount) / 1_000_000).toFixed(2)} USDC
            arrived on Solana
          </p>
          {status.receiving.txHash && (
            <a
              href={`https://solscan.io/tx/${status.receiving.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 underline"
            >
              View on Solscan →
            </a>
          )}
        </div>
      )}
    </div>
  );
}