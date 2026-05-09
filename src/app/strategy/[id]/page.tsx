"use client";

import { useEffect, useState }          from "react";
import { useParams }                    from "next/navigation";
import { Navbar }                       from "@/components/layout/Navbar";
import { Card, CardHeader, CardContent} from "@/components/ui/Card";
import { Button }                       from "@/components/ui/Button";
import { Badge }                        from "@/components/ui/Badge";
import { Alert }                        from "@/components/ui/Alert";
import { VoiceHistory }                 from "@/components/voice/VoiceHistory";
import { VoiceDemoButton }              from "@/components/voice/VoiceDemoButton";
import {
  formatUSD,
  formatTimeAgo,
  conditionDescription,
}                                       from "@/lib/utils";
import { useVoiceContext }              from "@/components/voice/VoiceProvider";
import type { Strategy, Trade }         from "@/types";

export default function StrategyDetailPage() {
  const { id }           = useParams<{ id: string }>();
  const { speak }        = useVoiceContext();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [trades, setTrades]     = useState<Trade[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "trades" | "voice"
  >("overview");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/strategies/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setStrategy(d.strategy);
        setTrades(d.strategy?.trades ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 px-6 min-h-screen">
          <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
            <div className="h-8 bg-gray-900 rounded-xl w-48" />
            <div className="h-48 bg-gray-900 rounded-2xl" />
            <div className="h-32 bg-gray-900 rounded-2xl" />
          </div>
        </main>
      </>
    );
  }

  if (!strategy) {
    return (
      <>
        <Navbar />
        <main className="pt-24 px-6 min-h-screen flex items-center justify-center">
          <Alert variant="error">Strategy not found.</Alert>
        </main>
      </>
    );
  }

  const available     = strategy.funded_amount - strategy.spent_amount;
  const tradesLeft    = Math.floor(available / strategy.amount_per_trade);
  const progressPct   = strategy.funded_amount > 0
    ? (strategy.spent_amount / strategy.funded_amount) * 100
    : 0;

  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen px-6 pb-12">
        <div className="max-w-3xl mx-auto pt-8 space-y-6">

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">
                  {strategy.token_out} Strategy
                </h1>
                <Badge
                  variant={strategy.status === "active" ? "green" : "yellow"}
                  dot={strategy.status === "active"}
                >
                  {strategy.status === "active" ? "Active" : "Paused"}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm">
                {conditionDescription(
                  strategy.condition_type,
                  strategy.condition_value,
                  strategy.token_out
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://explorer.solana.com/address/${strategy.escrow_address}?cluster=devnet`}
                target="_blank"
              >
                <Button variant="secondary" size="sm">
                  Explorer ↗
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Funded",
                value: formatUSD(strategy.funded_amount / 1_000_000),
                icon:  "💰",
              },
              {
                label: "Spent",
                value: formatUSD(strategy.spent_amount / 1_000_000),
                icon:  "📤",
              },
              {
                label: "Available",
                value: formatUSD(available / 1_000_000),
                icon:  "💳",
              },
              {
                label: "Trades Left",
                value: tradesLeft.toString(),
                icon:  "🔄",
              },
            ].map((stat) => (
              <Card key={stat.label} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{stat.icon}</span>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Budget used</span>
              <span>{progressPct.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-green-400"
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">
                {strategy.trigger_count} trades executed
              </span>
              <span className="text-gray-500">
                {strategy.last_triggered
                  ? `Last: ${formatTimeAgo(strategy.last_triggered)}`
                  : "No trades yet"}
              </span>
            </div>
          </Card>

          <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
            {(["overview", "trades", "voice"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  "flex-1 py-2 rounded-lg text-sm font-medium capitalize",
                  "transition-all duration-200",
                  activeTab === tab
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300",
                ].join(" ")}
              >
                {tab === "voice" ? "🎙️ Voice" : tab}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-white">
                    Strategy Details
                  </h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      label: "Token to buy",
                      value: strategy.token_out,
                    },
                    {
                      label: "Spending token",
                      value: strategy.token_in,
                    },
                    {
                      label: "Amount per trade",
                      value: formatUSD(strategy.amount_per_trade / 1_000_000),
                    },
                    {
                      label: "Condition",
                      value: conditionDescription(
                        strategy.condition_type,
                        strategy.condition_value,
                        strategy.token_out
                      ),
                    },
                    {
                      label: "Funded from",
                      value: strategy.funded_from_chain ?? "Solana",
                    },
                    {
                      label: "Program address",
                      value: strategy.escrow_address
                        ? `${strategy.escrow_address.slice(0, 8)}...`
                        : "Pending",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className="text-sm text-white font-medium">
                        {value}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "trades" && (
            <div className="space-y-3">
              {trades.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="text-4xl mb-3">💱</div>
                  <p className="text-gray-400 text-sm">
                    No trades yet. Waiting for your condition to trigger.
                  </p>
                </Card>
              ) : (
                trades.map((trade) => (
                  <Card key={trade.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">
                          Bought {trade.amount_out.toFixed(4)}{" "}
                          {strategy.token_out}
                        </p>
                        <p className="text-xs text-gray-400">
                          {trade.condition_met}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">
                          {formatUSD(trade.amount_in)}
                        </p>
                        <p className="text-xs text-gray-500">
                          @ ${trade.price_at_trade.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-gray-600">
                      <span>{formatTimeAgo(trade.created_at)}</span>
                      <a
                        href={`https://solscan.io/tx/${trade.tx_signature}?cluster=devnet`}
                        target="_blank"
                        className="text-purple-400 hover:underline"
                      >
                        {trade.tx_signature.slice(0, 12)}...
                      </a>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === "voice" && (
            <div className="space-y-4">
              <VoiceDemoButton />
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-white">Voice History</h2>
                </CardHeader>
                <CardContent>
                  <VoiceHistory
                    strategyId={id}
                    onReplay={(text) => {
                      speak("trade_executed", {
                        tokenOut:       strategy.token_out,
                        amountIn:       50,
                        amountOut:      0.35,
                        priceAtTrade:   142,
                        conditionMet:   text,
                        remainingFunds: available / 1_000_000,
                      });
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </>
  );
}