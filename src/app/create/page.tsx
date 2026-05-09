"use client";

import { useState }                     from "react";
import { useRouter }                    from "next/navigation";
import { useWallet }                    from "@solana/wallet-adapter-react";
import { useConnection }                from "@solana/wallet-adapter-react";
import { AnchorProvider }               from "@coral-xyz/anchor";
import { Navbar }                       from "@/components/layout/Navbar";
import { Card, CardHeader, CardContent} from "@/components/ui/Card";
import { Button }                       from "@/components/ui/Button";
import { Input }                        from "@/components/ui/Input";
import { Select }                       from "@/components/ui/Select";
import { Alert }                        from "@/components/ui/Alert";
import { BridgeWidget }                 from "@/components/bridge/BridgeWidget";
import { PROGRAM_ID } from "@/lib/program";
import {
  buildCreateStrategyTx,
  buildDepositTx,
  USDC_MINT,
}   
                                    from "@/lib/program";
import {
  SUPPORTED_TOKENS,
  conditionDescription,
}                                       from "@/lib/utils";
import { useStrategyVoice }             from "@/hooks/useStrategyVoice";
import type { CreateStrategyForm }      from "@/types";

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps:   string[];
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className={[
            "flex items-center justify-center",
            "w-7 h-7 rounded-full text-xs font-bold",
            "transition-all duration-300",
            i < current
              ? "bg-green-500 text-white"
              : i === current
              ? "bg-purple-500 text-white"
              : "bg-gray-800 text-gray-500 border border-gray-700",
          ].join(" ")}>
            {i < current ? "✓" : i + 1}
          </div>
          <span className={[
            "hidden sm:block text-xs font-medium",
            i === current ? "text-white" : "text-gray-500",
          ].join(" ")}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <div className={[
              "w-8 h-px",
              i < current ? "bg-green-500" : "bg-gray-700",
            ].join(" ")} />
          )}
        </div>
      ))}
    </div>
  );
}


function TokenSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (symbol: string, mint: string) => void;
}) {
  const tokens = SUPPORTED_TOKENS.filter((t) => t.symbol !== "USDC");

  return (
    <div className="grid grid-cols-3 gap-3">
      {tokens.map((token) => (
        <button
          key={token.symbol}
          onClick={() => onSelect(token.symbol, token.mint)}
          className={[
            "p-4 rounded-xl border-2 transition-all text-center",
            selected === token.symbol
              ? "border-purple-500 bg-purple-500/10"
              : "border-gray-700 bg-gray-900 hover:border-gray-600",
          ].join(" ")}
        >
          <div className="text-2xl mb-1">
            {token.symbol === "SOL"  ? "◎" :
             token.symbol === "JUP"  ? "🪐" :
             token.symbol === "BONK" ? "🐕" : "🪙"}
          </div>
          <p className="text-sm font-semibold text-white">
            {token.symbol}
          </p>
          <p className="text-xs text-gray-500">{token.name}</p>
        </button>
      ))}
    </div>
  );
}


function ConditionBuilder({
  form,
  onChange,
}: {
  form:     CreateStrategyForm;
  onChange: (updates: Partial<CreateStrategyForm>) => void;
}) {
  const preview = conditionDescription(
    form.conditionType,
    form.conditionValue,
    form.tokenOut || "TOKEN"
  );

  return (
    <div className="space-y-4">
      <Select
        label="Condition Type"
        value={form.conditionType}
        onChange={(e) => onChange({ conditionType: e.target.value as any })}
        options={[
          { value: "price_drop_percent", label: "Price drops by %" },
          { value: "price_below",        label: "Price goes below $" },
          { value: "price_above",        label: "Price goes above $" },
          { value: "day_of_week",        label: "Buy every week on day" },
        ]}
      />

      {form.conditionType === "price_drop_percent" && (
        <Input
          label="Drop percentage"
          type="number"
          min={1}
          max={50}
          value={form.conditionValue}
          onChange={(e) => onChange({ conditionValue: Number(e.target.value) })}
          suffix="%"
          hint="e.g. 5 = buy when price drops 5% in 24 hours"
        />
      )}

      {form.conditionType === "price_below" && (
        <Input
          label="Price threshold"
          type="number"
          min={0.001}
          value={form.conditionValue}
          onChange={(e) => onChange({ conditionValue: Number(e.target.value) })}
          prefix="$"
          hint={`Buy when ${form.tokenOut || "token"} price drops below this`}
        />
      )}

      {form.conditionType === "price_above" && (
        <Input
          label="Price threshold"
          type="number"
          min={0.001}
          value={form.conditionValue}
          onChange={(e) => onChange({ conditionValue: Number(e.target.value) })}
          prefix="$"
          hint={`Buy when ${form.tokenOut || "token"} price rises above this`}
        />
      )}

      {form.conditionType === "day_of_week" && (
        <Select
          label="Day of week"
          value={form.conditionValue.toString()}
          onChange={(e) => onChange({ conditionValue: Number(e.target.value) })}
          options={[
            { value: "0", label: "Sunday"    },
            { value: "1", label: "Monday"    },
            { value: "2", label: "Tuesday"   },
            { value: "3", label: "Wednesday" },
            { value: "4", label: "Thursday"  },
            { value: "5", label: "Friday"    },
            { value: "6", label: "Saturday"  },
          ]}
        />
      )}

      <div className="bg-purple-500/10 border border-purple-500/20 
                    rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-1">Preview</p>
        <p className="text-sm text-purple-300 font-medium">{preview}</p>
      </div>
    </div>
  );
}


const STEPS = ["Configure", "Fund", "Activate"];

const DEFAULT_FORM: CreateStrategyForm = {
  tokenOut:        "SOL",
  tokenOutMint:    "So11111111111111111111111111111111111111112",
  amountPerTrade:  50,
  conditionType:   "price_drop_percent",
  conditionValue:  5,
  conditionWindow: 24,
  fundingAmount:   200,
  fundingChain:    "solana",
};

export default function CreatePage() {
  const router                     = useRouter();
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection }             = useConnection();
  const voice                      = useStrategyVoice();

  const [step, setStep]            = useState(0);
  const [form, setForm]            = useState<CreateStrategyForm>(DEFAULT_FORM);
  const [loading, setLoading]      = useState(false);
  const [error, setError]          = useState("");
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [txSig, setTxSig]          = useState<string | null>(null);

  function updateForm(updates: Partial<CreateStrategyForm>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

// In src/app/create/page.tsx, replace handleCreateOnChain with this:

async function handleCreateOnChain() {
  if (!publicKey || !signTransaction) return;

  setLoading(true);
  setError("");

  try {
    const provider = new AnchorProvider(
      connection,
      { publicKey, signTransaction } as any,
      { commitment: "confirmed" }
    );

    const { tx, escrowPda, escrowUsdc } = await buildCreateStrategyTx(
      provider,
      form.conditionType,                          // "price_drop_percent" | ...
      Math.round(form.conditionValue * 100),       // e.g. 5% → 500 bps
      form.conditionWindow,                        // hours (24)
      Math.round(form.amountPerTrade * 1_000_000), // $50 → 50_000_000
      form.tokenOutMint,                           // output token mint
    );

    // Sign + send
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    const signed = await signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

    setTxSig(sig);

    // Save to Supabase
    const res = await fetch("/api/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_address:    publicKey.toString(),
        token_in:          "USDC",
        token_in_mint:     USDC_MINT.toString(),
        token_out:         form.tokenOut,
        token_out_mint:    form.tokenOutMint,
        amount_per_trade:  form.amountPerTrade * 1_000_000,
        condition_type:    form.conditionType,
        condition_value:   form.conditionValue,
        condition_window:  form.conditionWindow,
        escrow_address:    escrowPda.toString(),
        program_id:        PROGRAM_ID.toString(),
        chain_strategy_id: Date.now(),
        deploy_tx:         sig,
        funded_amount:     0,
        status:            "active",
      }),
    });

    const data = await res.json();
    setStrategyId(data.strategy?.id);
    voice.announceStrategyCreated(data.strategy?.id);
    setStep(1);
  } catch (err: any) {
    setError(err.message ?? "Transaction failed");
  } finally {
    setLoading(false);
  }
}


  async function handleDirectDeposit() {
    if (!publicKey || !signTransaction || !strategyId) return;

    setLoading(true);
    setError("");

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction } as any,
        { commitment: "confirmed" }
      );

      const res      = await fetch(`/api/strategies/${strategyId}`);
      const data     = await res.json();
      const chainId  = data.strategy?.chain_strategy_id;

      const { tx } = await buildDepositTx(
        provider,
        Math.round(form.fundingAmount * 1_000_000),
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash   = blockhash;
      tx.feePayer          = publicKey;

      const signed = await signTransaction(tx);
      const sig    = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      await fetch(`/api/strategies/${strategyId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          funded_amount:   form.fundingAmount * 1_000_000,
          funded_from_chain: "solana",
        }),
      });

      voice.announceDepositConfirmed(strategyId);
      setStep(2);
    } catch (err: any) {
      setError(err.message ?? "Deposit failed");
    } finally {
      setLoading(false);
    }
  }

  function handleBridgeComplete(amount: number, txHash: string) {
    setStep(2);
    if (strategyId) {
      voice.announceBridgeComplete(form.fundingChain, amount, 180, strategyId);
    }
  }

  if (!connected) {
    return (
      <>
        <Navbar />
        <main className="pt-24 px-6 min-h-screen flex items-center justify-center">
          <Card className="p-12 text-center space-y-4 max-w-md w-full">
            <div className="text-5xl">👻</div>
            <h2 className="text-xl font-semibold text-white">
              Connect your Solana wallet
            </h2>
            <p className="text-gray-400 text-sm">
              You need Phantom, Backpack, or Solflare to create a strategy
            </p>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="pt-20 min-h-screen px-6 pb-12">
        <div className="max-w-2xl mx-auto pt-8 space-y-6">

          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">
              Create Strategy
            </h1>
            <StepIndicator current={step} steps={STEPS} />
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-white">
                    What do you want to buy?
                  </h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TokenSelector
                    selected={form.tokenOut}
                    onSelect={(symbol, mint) =>
                      updateForm({ tokenOut: symbol, tokenOutMint: mint })
                    }
                  />

                  <Input
                    label="Amount per trade (USDC)"
                    type="number"
                    min={1}
                    value={form.amountPerTrade}
                    onChange={(e) =>
                      updateForm({ amountPerTrade: Number(e.target.value) })
                    }
                    prefix="$"
                    hint="How much USDC to spend each time the condition triggers"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-white">
                    When should it buy?
                  </h2>
                </CardHeader>
                <CardContent>
                  <ConditionBuilder
                    form={form}
                    onChange={updateForm}
                  />
                </CardContent>
              </Card>

              {error && <Alert variant="error">{error}</Alert>}

              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={handleCreateOnChain}
                loading={loading}
              >
                Deploy Strategy on Solana →
              </Button>

              {txSig && (
                <p className="text-center text-xs text-gray-500">
                  Tx:{" "}
                  <a
                    href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                    target="_blank"
                    className="text-purple-400 underline"
                  >
                    {txSig.slice(0, 20)}...
                  </a>
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Alert variant="success">
                Strategy deployed on Solana! Now fund it to activate.
              </Alert>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-white">
                    How do you want to fund?
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateForm({ fundingChain: "solana" })}
                      className={[
                        "p-4 rounded-xl border-2 text-center transition-all",
                        form.fundingChain === "solana"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-gray-700 hover:border-gray-600",
                      ].join(" ")}
                    >
                      <div className="text-2xl mb-1">◎</div>
                      <p className="text-sm font-medium text-white">
                        Solana USDC
                      </p>
                      <p className="text-xs text-gray-500">Direct deposit</p>
                    </button>

                    <button
                      onClick={() => updateForm({ fundingChain: "ethereum" })}
                      className={[
                        "p-4 rounded-xl border-2 text-center transition-all",
                        form.fundingChain !== "solana"
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-gray-700 hover:border-gray-600",
                      ].join(" ")}
                    >
                      <div className="text-2xl mb-1">🌐</div>
                      <p className="text-sm font-medium text-white">
                        Any Chain
                      </p>
                      <p className="text-xs text-gray-500">Bridge via LI.FI</p>
                    </button>
                  </div>

                  {form.fundingChain === "solana" && (
                    <div className="space-y-4">
                      <Input
                        label="Amount to deposit (USDC)"
                        type="number"
                        min={form.amountPerTrade}
                        value={form.fundingAmount}
                        onChange={(e) =>
                          updateForm({ fundingAmount: Number(e.target.value) })
                        }
                        prefix="$"
                        hint={`Minimum: $${form.amountPerTrade} (1 trade)`}
                      />

                      {error && <Alert variant="error">{error}</Alert>}

                      <Button
                        variant="gradient"
                        size="lg"
                        className="w-full"
                        onClick={handleDirectDeposit}
                        loading={loading}
                      >
                        Deposit {formatUSD(form.fundingAmount)} USDC →
                      </Button>
                    </div>
                  )}

                  {form.fundingChain !== "solana" && strategyId && (
                    <BridgeWidget
                      strategyId={strategyId}
                      targetAmount={form.fundingAmount}
                      onBridgeComplete={handleBridgeComplete}
                    />
                  )}
                </CardContent>
              </Card>

              <button
                onClick={() => setStep(2)}
                className="w-full text-center text-sm text-gray-500 
                         hover:text-gray-300 transition-colors py-2"
              >
                Skip funding for now →
              </button>
            </div>
          )}

          {step === 2 && strategyId && (
            <div className="space-y-4">
              <Card glow="green" className="p-8 text-center space-y-4">
                <div className="text-5xl">🎉</div>
                <h2 className="text-2xl font-bold text-white">
                  Strategy Active!
                </h2>
                <p className="text-gray-400">
                  SmartDCA is now monitoring conditions and
                  will execute trades automatically on Solana.
                </p>

                <div className="bg-gray-900 rounded-xl p-4 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Token</span>
                    <span className="text-white font-medium">
                      {form.tokenOut}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Condition</span>
                    <span className="text-white font-medium">
                      {conditionDescription(
                        form.conditionType,
                        form.conditionValue,
                        form.tokenOut
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Per trade</span>
                    <span className="text-white font-medium">
                      ${form.amountPerTrade} USDC
                    </span>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                  className="w-full"
                >
                  View Dashboard
                </Button>
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={() => router.push(`/strategy/${strategyId}`)}
                  className="w-full"
                >
                  View Strategy →
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency: "USD",
  }).format(amount);
}