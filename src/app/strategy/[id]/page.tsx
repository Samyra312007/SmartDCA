"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUSD, formatTimeAgo, conditionDescription } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Wallet, TrendingUp, Activity, Clock, Coins } from "lucide-react";
import type { Strategy, Trade } from "@/types";

export default function StrategyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/strategies/${id}`).then(r => r.json()).then(d => { setStrategy(d.strategy); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background text-foreground"><Navbar /><main className="pt-24 px-6 max-w-4xl mx-auto space-y-6"><Skeleton className="h-20 rounded-2xl w-full" /><div className="grid grid-cols-4 gap-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div></main></div>;
  if (!strategy) return <div className="min-h-screen bg-background"><Navbar /><main className="pt-32 flex justify-center text-red-500">Not found</main></div>;

  const available = strategy.funded_amount - strategy.spent_amount;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 px-6 pb-20 max-w-4xl mx-auto space-y-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> Back
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-solana-purple/10 flex items-center justify-center text-solana-purple"><Coins className="size-6" /></div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">{strategy.token_out} Vault</h1>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{conditionDescription(strategy.condition_type, strategy.condition_value, strategy.token_out)}</p>
            </div>
          </div>
          <Badge className={strategy.status === "active" ? "bg-solana-green/10 text-solana-green border-solana-green/20" : "bg-muted text-muted-foreground"}>
            {strategy.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Funded", value: formatUSD(strategy.funded_amount / 1_000_000), icon: Wallet, color: "text-solana-purple" },
            { label: "Spent", value: formatUSD(strategy.spent_amount / 1_000_000), icon: TrendingUp, color: "text-solana-green" },
            { label: "Available", value: formatUSD(available / 1_000_000), icon: Activity, color: "text-blue-500" },
            { label: "Executed", value: strategy.trigger_count.toString(), icon: Clock, color: "text-orange-500" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card/30 border-border/50 p-4">
              <div className={`size-8 rounded-lg bg-muted/50 flex items-center justify-center mb-2 ${stat.color}`}><stat.icon className="size-4" /></div>
              <p className="text-lg font-black tracking-tighter">{stat.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <Card className="bg-card/30 border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50"><h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Configuration</h2></CardHeader>
          <CardContent className="p-0">
            {[
              { label: "Target Token", value: strategy.token_out },
              { label: "Quote Token", value: strategy.token_in },
              { label: "Size per Trade", value: formatUSD(strategy.amount_per_trade / 1_000_000) },
              { label: "Source", value: strategy.funded_from_chain || "Solana" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center px-6 py-4 border-b border-border/30 last:border-0">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{row.label}</span>
                <span className="text-sm font-black text-foreground">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}