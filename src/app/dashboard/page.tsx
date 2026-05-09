"use client";

import { useEffect, useState }          from "react";
import Link                             from "next/link";
import { useWallet }                    from "@solana/wallet-adapter-react";
import { Navbar }                       from "@/components/layout/Navbar";
import { Card, CardContent }            from "@/components/ui/Card";
import { Button }                       from "@/components/ui/Button";
import { Badge }                        from "@/components/ui/Badge";
import {
  formatUSD,
  formatTimeAgo,
  conditionDescription,
}                                       from "@/lib/utils";
import type { Strategy }                from "@/types";


function StrategyCard({ strategy }: { strategy: Strategy }) {
  const available = strategy.funded_amount - strategy.spent_amount;
  const progress  = strategy.funded_amount > 0
    ? (strategy.spent_amount / strategy.funded_amount) * 100
    : 0;

  const statusConfig = {
    active: {
      variant: "green"  as const,
      label:   "Active",
      dot:     true,
    },
    paused: {
      variant: "yellow" as const,
      label:   "Paused",
      dot:     false,
    },
    completed: {
      variant: "purple" as const,
      label:   "Completed",
      dot:     false,
    },
    insufficient_funds: {
      variant: "red"    as const,
      label:   "Low Funds",
      dot:     false,
    },
  };

  const sc = statusConfig[strategy.status] ?? statusConfig.paused;

  return (
    <Link href={`/strategy/${strategy.id}`}>
      <Card hover className="p-5 space-y-4">

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                {strategy.token_out}
              </span>
              <span className="text-gray-500 text-sm">← USDC</span>
            </div>
            <p className="text-xs text-gray-500">
              {conditionDescription(
                strategy.condition_type,
                strategy.condition_value,
                strategy.token_out
              )}
            </p>
          </div>
          <Badge
            variant={sc.variant}
            dot={sc.dot}
          >
            {sc.label}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Per Trade</p>
            <p className="text-sm font-semibold text-white">
              {formatUSD(strategy.amount_per_trade / 1_000_000)}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Trades</p>
            <p className="text-sm font-semibold text-white">
              {strategy.trigger_count}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Remaining</p>
            <p className="text-sm font-semibold text-white">
              {formatUSD(available)}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Spent: {formatUSD(strategy.spent_amount)}</span>
            <span>Total: {formatUSD(strategy.funded_amount)}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-green-400 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {strategy.funded_from_chain
              ? `Funded from ${strategy.funded_from_chain}`
              : "Funded on Solana"}
          </span>
          <span>
            {strategy.last_triggered
              ? `Last trade ${formatTimeAgo(strategy.last_triggered)}`
              : "No trades yet"}
          </span>
        </div>
      </Card>
    </Link>
  );
}


function StatsBar({ strategies }: { strategies: Strategy[] }) {
  const totalFunded = strategies.reduce(
    (sum, s) => sum + s.funded_amount, 0
  );
  const totalSpent = strategies.reduce(
    (sum, s) => sum + s.spent_amount, 0
  );
  const totalTrades = strategies.reduce(
    (sum, s) => sum + s.trigger_count, 0
  );
  const activeCount = strategies.filter(
    (s) => s.status === "active"
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        {
          label: "Total Funded",
          value: formatUSD(totalFunded),
          icon:  "💰",
        },
        {
          label: "Total Spent",
          value: formatUSD(totalSpent),
          icon:  "📤",
        },
        {
          label: "Total Trades",
          value: totalTrades.toString(),
          icon:  "💱",
        },
        {
          label: "Active Strategies",
          value: activeCount.toString(),
          icon:  "⚡",
        },
      ].map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}


export default function DashboardPage() {
  const { publicKey, connected } = useWallet();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    fetch(`/api/strategies?wallet=${publicKey.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setStrategies(d.strategies ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [publicKey]);

  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen px-6 pb-12">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="flex items-center justify-between pt-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">
                Your active DCA strategies on Solana
              </p>
            </div>
            <Link href="/create">
              <Button variant="gradient">
                + New Strategy
              </Button>
            </Link>
          </div>

          {!connected && (
            <Card className="p-12 text-center space-y-4">
              <div className="text-5xl">👻</div>
              <h2 className="text-xl font-semibold text-white">
                Connect your Solana wallet
              </h2>
              <p className="text-gray-400 text-sm">
                Connect Phantom, Backpack, or Solflare to view your strategies
              </p>
            </Card>
          )}

          {connected && loading && (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-gray-900 animate-pulse"
                />
              ))}
            </div>
          )}

          {connected && !loading && strategies.length > 0 && (
            <>
              <StatsBar strategies={strategies} />
              <div className="grid md:grid-cols-2 gap-4">
                {strategies.map((strategy) => (
                  <StrategyCard key={strategy.id} strategy={strategy} />
                ))}
              </div>
            </>
          )}

          {connected && !loading && strategies.length === 0 && (
            <Card className="p-16 text-center space-y-6">
              <div className="text-6xl">🎯</div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  No strategies yet
                </h2>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  Create your first conditional DCA strategy.
                  Set a condition, fund it from any chain,
                  and let SmartDCA do the rest.
                </p>
              </div>
              <Link href="/create">
                <Button variant="gradient" size="lg">
                  Create First Strategy →
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}