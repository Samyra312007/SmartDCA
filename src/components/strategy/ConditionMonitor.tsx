"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardContent }    from "@/components/ui/Card";
import { Badge }                            from "@/components/ui/Badge";
import { Button }                           from "@/components/ui/Button";
import { useStrategyVoice }                 from "@/hooks/useStrategyVoice";
import { cn }                               from "@/lib/utils";
import type { Strategy }                    from "@/types";

interface ConditionStatus {
  met:          boolean;
  reason:       string;
  currentPrice: number;
  triggerValue: number;
  lastChecked:  Date;
}

interface Props {
  strategy:   Strategy;
  onTrigger?: (tradeData: any) => void;
}

export function ConditionMonitor({ strategy, onTrigger }: Props) {
  const voice = useStrategyVoice();

  const [status, setStatus]     = useState<ConditionStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastTrade, setLastTrade] = useState<any>(null);
  const [autoCheck, setAutoCheck] = useState(true);
  const [checkCount, setCheckCount] = useState(0);


  const checkCondition = useCallback(async () => {
    setChecking(true);

    try {
      const res  = await fetch(
        `/api/execute?strategyId=${strategy.id}`
      );
      const data = await res.json();

      setStatus({
        met:          data.met,
        reason:       data.reason,
        currentPrice: data.currentPrice,
        triggerValue: data.triggerValue,
        lastChecked:  new Date(),
      });

      setCheckCount((c) => c + 1);

      if (data.met) {
        voice.announceConditionMet(strategy, data.currentPrice);
      }
    } catch {
    } finally {
      setChecking(false);
    }
  }, [strategy, voice]);


  useEffect(() => {
    if (!autoCheck) return;

    checkCondition();

    // Then every 30 seconds
    const interval = setInterval(checkCondition, 30_000);
    return () => clearInterval(interval);
  }, [autoCheck, checkCondition]);


  async function handleForceExecute() {
    setExecuting(true);

    try {
      const res  = await fetch("/api/execute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          strategyId:   strategy.id,
          forceExecute: true,
        }),
      });

      const data = await res.json();

      if (data.executed) {
        setLastTrade(data.trade);
        onTrigger?.(data);

        voice.announceTradeExecuted(data.trade, strategy);
      }
    } catch (err) {
      console.error("Execute error:", err);
    } finally {
      setExecuting(false);
    }
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">
            Condition Monitor
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoCheck((a) => !a)}
              className={cn(
                "text-xs px-2 py-1 rounded-lg transition-colors",
                autoCheck
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-800 text-gray-500"
              )}
            >
              {autoCheck ? "⟳ Auto" : "⏸ Paused"}
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={checkCondition}
              loading={checking}
            >
              Check Now
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {status && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">
                Current Price
              </p>
              <p className="text-lg font-bold text-white">
                ${status.currentPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {strategy.token_out}/USD
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">
                Trigger At
              </p>
              <p className="text-lg font-bold text-white">
                {strategy.condition_type === "price_drop_percent"
                  ? `${strategy.condition_value / 100}% drop`
                  : `$${(strategy.condition_value / 100).toFixed(2)}`}
              </p>
              <p className="text-xs text-gray-500">
                {strategy.condition_type.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}

        <div className={cn(
          "rounded-xl p-4 border transition-all",
          status?.met
            ? "bg-green-500/10 border-green-500/20"
            : "bg-gray-900 border-gray-800"
        )}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {checking      ? "⟳"  :
               status?.met  ? "✅" : "⏳"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={status?.met ? "green" : "gray"} dot={status?.met}>
                  {checking      ? "Checking..."      :
                   status?.met  ? "Condition Met!"   : "Monitoring"}
                </Badge>
                {checkCount > 0 && (
                  <span className="text-xs text-gray-600">
                    Checked {checkCount}x
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {checking
                  ? "Fetching latest price data..."
                  : status?.reason ?? "Waiting for first check..."}
              </p>
              {status?.lastChecked && (
                <p className="text-xs text-gray-600 mt-1">
                  Last checked:{" "}
                  {status.lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {status?.met && !lastTrade && (
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleForceExecute}
              loading={executing}
            >
              ⚡ Execute Trade Now
            </Button>
          )}

          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleForceExecute}
            loading={executing}
          >
            🎮 Force Execute (Demo)
          </Button>
        </div>

        {lastTrade && (
          <div className="bg-green-500/10 border border-green-500/20 
                         rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-green-400">
              ✅ Trade Executed!
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Spent</p>
                <p className="text-white font-medium">
                  ${lastTrade.amount_in?.toFixed(2)} USDC
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Received</p>
                <p className="text-white font-medium">
                  {lastTrade.amount_out?.toFixed(4)}{" "}
                  {strategy.token_out}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Route: {lastTrade.route_used}
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}