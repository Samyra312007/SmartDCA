import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getSwapQuote, TOKEN_MINTS } from "@/lib/jupiter";
import { evaluateCondition } from "@/lib/conditionMonitor";
import { supabase } from "@/lib/supabase";
import { USDC_MINT } from "@/lib/program";
import { SWAP_CONFIG, getTokenDecimals, TX_CONFIG, ERROR_MESSAGES } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { strategyId, forceExecute } = body;

    if (!strategyId) {
      return NextResponse.json({ error: "strategyId required" }, { status: 400 });
    }

    const { data: strategy, error: strategyError } = await supabase
      .from("strategies")
      .select("*")
      .eq("id", strategyId)
      .single();

    if (strategyError || !strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    if (strategy.status !== "active") {
      return NextResponse.json({ error: "Strategy is not active" }, { status: 400 });
    }

    const tokenSymbol = Object.entries(TOKEN_MINTS).find(
      ([, mint]) => mint === strategy.token_out_mint
    )?.[0] ?? "SOL";

    let conditionResult;

    if (!forceExecute) {
      conditionResult = await evaluateCondition(strategy);
      if (!conditionResult.met) {
        return NextResponse.json({
          executed: false,
          reason: conditionResult.reason,
          price: conditionResult.currentPrice,
        });
      }
    } else {
      const { getTokenPrice } = await import("@/lib/jupiter");
      const price = await getTokenPrice(strategy.token_out_mint);
      conditionResult = {
        met: true,
        reason: "Force executed for demo",
        currentPrice: price ?? 0,
        triggerValue: 0,
      };
    }

    const amountIn = Math.floor(strategy.amount_per_trade); 

    const quote = await getSwapQuote(
      USDC_MINT.toString(),
      strategy.token_out_mint,
      amountIn,
      SWAP_CONFIG.DEFAULT_SLIPPAGE_BPS
    );

    if (!quote) {
      return NextResponse.json({ error: "Failed to get swap quote from Jupiter" }, { status: 500 });
    }

    const amountOut = Number(quote.outAmount);
    const decimals = getTokenDecimals(tokenSymbol);
    const humanOut = amountOut / Math.pow(10, decimals);
    const priceImpact = parseFloat(quote.priceImpactPct);

    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert([{
        strategy_id: strategyId,
        condition_met: conditionResult.reason,
        amount_in: strategy.amount_per_trade / 1_000_000,
        amount_out: humanOut,
        price_at_trade: conditionResult.currentPrice,
        tx_signature: TX_CONFIG.SIMULATED_PREFIX + Math.random().toString(36).slice(2, 10),
        route_used: quote.routePlan[0]?.swapInfo?.label ?? "Jupiter",
        price_impact: priceImpact,
      }])
      .select()
      .single();

    if (tradeError) console.error("Trade record error:", tradeError);

    await supabase
      .from("strategies")
      .update({
        spent_amount: strategy.spent_amount + strategy.amount_per_trade,
        trigger_count: strategy.trigger_count + 1,
        last_triggered: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", strategyId);

    await supabase.from("voice_alerts").insert([{
      strategy_id: strategyId,
      alert_type: "trade_executed",
      message: `Your DCA strategy triggered. ${conditionResult.reason}. Bought ${humanOut.toFixed(4)} ${tokenSymbol} for $${(strategy.amount_per_trade / 1_000_000).toFixed(2)} USDC at $${conditionResult.currentPrice.toFixed(2)}.`,
      played: false,
    }]);

    return NextResponse.json({
      executed: true,
      reason: conditionResult.reason,
      amountIn: strategy.amount_per_trade / 1_000_000,
      amountOut: humanOut,
      tokenSymbol,
      price: conditionResult.currentPrice,
      priceImpact,
      route: quote.routePlan[0]?.swapInfo?.label ?? "Jupiter",
      tradeId: trade?.id,
    });

  } catch (err: any) {
    console.error("Execute error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
