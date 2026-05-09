import { getTokenPrice, TOKEN_MINTS } from "./jupiter";
import { supabase }                   from "./supabase";
import type { Strategy }              from "@/types";


export interface ConditionResult {
  met:          boolean;
  reason:       string;
  currentPrice: number;
  triggerValue: number;
}

export async function evaluateCondition(
  strategy: Strategy
): Promise<ConditionResult> {
  const mint         = strategy.token_out_mint;
  const currentPrice = await getTokenPrice(mint);

  if (!currentPrice) {
    return {
      met:          false,
      reason:       "Could not fetch price",
      currentPrice: 0,
      triggerValue: strategy.condition_value,
    };
  }

  switch (strategy.condition_type) {

    case "price_drop_percent": {
      const hoursAgo    = strategy.condition_window ?? 24;
      const cutoff      = new Date(
        Date.now() - hoursAgo * 3600 * 1000
      ).toISOString();

      const { data: snapshots } = await supabase
        .from("price_snapshots")
        .select("price, captured_at")
        .eq("token", strategy.token_out)
        .gte("captured_at", cutoff)
        .order("captured_at", { ascending: true })
        .limit(1);

      const oldPrice = snapshots?.[0]?.price ?? currentPrice;
      const dropPct  = ((oldPrice - currentPrice) / oldPrice) * 100;

      // condition_value is raw percent (e.g. 5 for 5%)
      const threshold = strategy.condition_value;
      const met       = dropPct >= threshold;

      return {
        met,
        reason: met
          ? `${strategy.token_out} dropped ${dropPct.toFixed(2)}% in ${hoursAgo}h (threshold: ${threshold}%)`
          : `${strategy.token_out} only dropped ${dropPct.toFixed(2)}% (need ${threshold}%)`,
        currentPrice,
        triggerValue: threshold,
      };
    }

    case "price_below": {
      const threshold = strategy.condition_value;
      const met       = currentPrice <= threshold;

      return {
        met,
        reason: met
          ? `${strategy.token_out} price $${currentPrice.toFixed(2)} is below $${threshold}`
          : `${strategy.token_out} price $${currentPrice.toFixed(2)} is above $${threshold}`,
        currentPrice,
        triggerValue: threshold,
      };
    }

    case "price_above": {
      const threshold = strategy.condition_value;
      const met       = currentPrice >= threshold;

      return {
        met,
        reason: met
          ? `${strategy.token_out} price $${currentPrice.toFixed(2)} is above $${threshold}`
          : `${strategy.token_out} price $${currentPrice.toFixed(2)} is below $${threshold}`,
        currentPrice,
        triggerValue: threshold,
      };
    }

    case "day_of_week": {
      const today = new Date().getDay(); // 0 = Sunday
      const met   = today === strategy.condition_value;
      const days  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

      return {
        met,
        reason: met
          ? `Today is ${days[today]}, your scheduled buy day`
          : `Today is ${days[today]}, buy day is ${days[strategy.condition_value]}`,
        currentPrice,
        triggerValue: strategy.condition_value,
      };
    }

    default:
      return {
        met:          false,
        reason:       "Unknown condition type",
        currentPrice: 0,
        triggerValue: 0,
      };
  }
}


export async function checkAllActiveStrategies(): Promise<{
  checked:   number;
  triggered: number;
  results:   Array<{
    strategyId: string;
    met:        boolean;
    reason:     string;
  }>;
}> {
  const { data: strategies, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("status", "active")
    .gt("funded_amount", 0);

  if (error || !strategies) {
    return { checked: 0, triggered: 0, results: [] };
  }

  const results = [];
  let triggered = 0;

  for (const strategy of strategies) {
    const available = strategy.funded_amount - strategy.spent_amount;
    if (available < strategy.amount_per_trade) {
      await supabase
        .from("strategies")
        .update({ status: "insufficient_funds" })
        .eq("id", strategy.id);
      continue;
    }

    if (strategy.last_triggered) {
      const lastTime  = new Date(strategy.last_triggered).getTime();
      const hourAgo   = Date.now() - 3600 * 1000;
      if (lastTime > hourAgo) {
        results.push({
          strategyId: strategy.id,
          met:        false,
          reason:     "Cooldown: less than 1 hour since last trade",
        });
        continue;
      }
    }

    const result = await evaluateCondition(strategy as Strategy);
    results.push({
      strategyId: strategy.id,
      met:        result.met,
      reason:     result.reason,
    });

    if (result.met) {
      triggered++;
      
      // Call the execution endpoint to process the trade
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        await fetch(`${baseUrl}/api/execute`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ strategyId: strategy.id }),
        });
      } catch (err) {
        console.error(`Failed to trigger execution for strategy ${strategy.id}:`, err);
      }
    }
  }

  return {
    checked:   strategies.length,
    triggered,
    results,
  };
}