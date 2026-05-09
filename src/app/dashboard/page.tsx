"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  Activity, 
  Coins, 
  ArrowUpRight,
  RefreshCw,
  Clock
} from "lucide-react";
import {
  formatUSD,
  formatTimeAgo,
  conditionDescription,
} from "@/lib/utils";
import type { Strategy } from "@/types";

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const available = strategy.funded_amount - strategy.spent_amount;
  const progress  = strategy.funded_amount > 0 ? (strategy.spent_amount / strategy.funded_amount) * 100 : 0;

  const statusConfig = {
    active: { label: "Active", className: "bg-solana-green/10 text-solana-green border-solana-green/20" },
    paused: { label: "Paused", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    completed: { label: "Completed", className: "bg-solana-purple/10 text-solana-purple border-solana-purple/20" },
    insufficient_funds: { label: "Low Funds", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  };

  const sc = statusConfig[strategy.status] || statusConfig.paused;

  return (
    <Link href={`/strategy/${strategy.id}`}>
      <Card className="hover:border-solana-purple/40 transition-all duration-300 group overflow-hidden bg-card/30 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-solana-purple/10 flex items-center justify-center text-solana-purple">
                <Coins className="size-4" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">{strategy.token_out}</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">via USDC</p>
              </div>
            </div>
            <Badge className={sc.className}>{sc.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Trigger Condition</p>
            <p className="text-sm font-semibold">{conditionDescription(strategy.condition_type, strategy.condition_value, strategy.token_out)}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Per Trade</p>
              <p className="text-sm font-black">{formatUSD(strategy.amount_per_trade / 1_000_000)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Executed</p>
              <p className="text-sm font-black">{strategy.trigger_count}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Balance</p>
              <p className="text-sm font-black">{formatUSD(available)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
              <span className="text-muted-foreground">Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-solana-purple to-solana-green" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-2 border-t border-border/30">
            <span>{strategy.funded_from_chain || "Solana"}</span>
            <span>{strategy.last_triggered ? formatTimeAgo(strategy.last_triggered) : "No trades"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) { setLoading(false); return; }
    fetch(`/api/strategies?wallet=${publicKey.toString()}`)
      .then((r) => r.json())
      .then((d) => { setStrategies(d.strategies || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [publicKey]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 px-6 pb-20 max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">Vaults</h1>
            <p className="text-muted-foreground font-medium text-sm">Active conditional DCA strategies on Solana Devnet.</p>
          </div>
          <Link href="/create">
            <Button className="rounded-xl h-12 px-6 font-black bg-gradient-to-r from-solana-purple to-solana-green text-black">
              <Plus className="size-4 mr-2" /> NEW STRATEGY
            </Button>
          </Link>
        </div>

        {connected && loading && (
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-3xl bg-muted/50" />
            <Skeleton className="h-64 rounded-3xl bg-muted/50" />
          </div>
        )}

        {connected && !loading && strategies.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {strategies.map((s) => <StrategyCard key={s.id} strategy={s} />)}
          </div>
        )}

        {!connected && (
          <Card className="p-20 text-center bg-muted/5 border-dashed border-2 border-border/50">
            <Wallet className="size-10 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-black uppercase text-foreground">Connect Wallet</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Connect your Solana wallet to manage your automated DCA vaults.</p>
          </Card>
        )}
      </main>
    </div>
  );
}