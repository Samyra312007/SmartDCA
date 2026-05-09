"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { BridgeWidget } from "@/components/bridge/BridgeWidget";
import { PROGRAM_ID, buildCreateStrategyTx, USDC_MINT } from "@/lib/program";
import { SUPPORTED_TOKENS, conditionDescription } from "@/lib/utils";
import { useStrategyVoice } from "@/hooks/useStrategyVoice";
import { Zap, Check, Wallet, ArrowRight } from "lucide-react";

export default function CreatePage() {
  const router = useRouter();
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const voice = useStrategyVoice();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tokenOut: "SOL",
    tokenOutMint: "So11111111111111111111111111111111111111112",
    amountPerTrade: 50,
    conditionType: "price_drop_percent" as const,
    conditionValue: 5,
    conditionWindow: 24,
    fundingAmount: 200,
  });

  async function handleCreate() {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    try {
      const provider = new AnchorProvider(connection, { publicKey, signTransaction } as any, { commitment: "confirmed" });
      const { tx, escrowPda } = await buildCreateStrategyTx(provider, form.conditionType, form.conditionValue * 100, 24, form.amountPerTrade * 1_000_000, form.tokenOutMint);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const sig = await connection.sendRawTransaction((await signTransaction(tx)).serialize());
      await connection.confirmTransaction(sig, "confirmed");

      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: publicKey.toString(),
          token_out: form.tokenOut,
          token_out_mint: form.tokenOutMint,
          amount_per_trade: form.amountPerTrade * 1_000_000,
          condition_type: form.conditionType,
          condition_value: form.conditionValue,
          escrow_address: escrowPda.toString(),
          status: "active",
        }),
      });
      const data = await res.json();
      setStrategyId(data.strategy?.id);
      setStep(1);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  if (!connected) return <div className="min-h-screen bg-background"><Navbar /><main className="pt-32 flex justify-center px-6"><Card className="p-12 text-center max-w-md w-full"><Wallet className="size-10 mx-auto mb-4" /><h2 className="text-xl font-black uppercase">Connect Wallet</h2></Card></main></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 px-6 pb-20 max-w-2xl mx-auto space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-tight text-center">New Strategy</h1>
        
        {step === 0 && (
          <div className="space-y-6">
            <Card className="bg-card/30 backdrop-blur-sm">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {SUPPORTED_TOKENS.filter(t => t.symbol !== "USDC").map(t => (
                    <button key={t.symbol} onClick={() => setForm({...form, tokenOut: t.symbol, tokenOutMint: t.mint})} className={`p-4 rounded-xl border-2 transition-all ${form.tokenOut === t.symbol ? "border-solana-purple bg-solana-purple/5" : "border-border"}`}>
                      <p className="text-sm font-black">{t.symbol}</p>
                    </button>
                  ))}
                </div>
                <Input type="number" value={form.amountPerTrade} onChange={e => setForm({...form, amountPerTrade: Number(e.target.value)})} className="h-12 bg-muted/30 font-bold" />
                <select value={form.conditionType} onChange={e => setForm({...form, conditionType: e.target.value as any})} className="w-full h-12 bg-muted/30 rounded-xl border px-4 font-bold text-sm outline-none">
                  <option value="price_drop_percent">Price drops by %</option>
                  <option value="price_below">Price goes below $</option>
                </select>
                <Input type="number" value={form.conditionValue} onChange={e => setForm({...form, conditionValue: Number(e.target.value)})} className="h-12 bg-muted/30 font-bold" />
              </CardContent>
            </Card>
            <Button size="lg" className="w-full h-14 bg-foreground text-background font-black" onClick={handleCreate} disabled={loading}>{loading ? "DEPOYING..." : "DEPLOY STRATEGY"}</Button>
          </div>
        )}

        {step === 1 && strategyId && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-black uppercase">Fund Strategy</h2>
            <BridgeWidget strategyId={strategyId} targetAmount={form.fundingAmount} onBridgeComplete={() => setStep(2)} />
            <Button variant="ghost" onClick={() => setStep(2)}>Skip →</Button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-8 py-10">
            <Zap className="size-16 mx-auto text-solana-green" />
            <h2 className="text-3xl font-black uppercase">Vault Active</h2>
            <div className="flex gap-4">
              <Button size="lg" variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>DASHBOARD</Button>
              <Button size="lg" className="flex-1" onClick={() => router.push(`/strategy/${strategyId}`)}>VIEW VAULT</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}