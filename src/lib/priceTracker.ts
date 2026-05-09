import { supabase } from "./supabase";
import { getTokenPrice, getMultipleTokenPrices, TOKEN_MINTS } from "./jupiter";


export interface PriceSnapshot {
  token:      string;
  price:      number;
  change1h:   number | null;
  change24h:  number | null;
  capturedAt: string;
}

export interface ConditionCheckResult {
  met:         boolean;
  reason:      string;    
  currentPrice: number;
  previousPrice: number | null;
  changePercent: number | null;
}

export async function capturePrice(
  tokenSymbol: string
): Promise<PriceSnapshot | null> {
  const mint = TOKEN_MINTS[tokenSymbol.toUpperCase()];
  if (!mint) return null;

  const price = await getTokenPrice(mint);
  if (!price) return null;

  const [price1hAgo, price24hAgo] = await Promise.all([
    getPriceAtTime(tokenSymbol, 1),
    getPriceAtTime(tokenSymbol, 24),
  ]);

  const change1h  = price1hAgo
    ? ((price - price1hAgo) / price1hAgo) * 100
    : null;

  const change24h = price24hAgo
    ? ((price - price24hAgo) / price24hAgo) * 100
    : null;

  const { data, error } = await supabase
    .from("price_snapshots")
    .insert([{
      token:      tokenSymbol.toUpperCase(),
      price,
      change_1h:  change1h,
      change_24h: change24h,
      source:     "jupiter",
    }])
    .select()
    .single();

  if (error) {
    console.error("capturePrice error:", error);
    return null;
  }

  return {
    token:      tokenSymbol,
    price,
    change1h,
    change24h,
    capturedAt: data.captured_at,
  };
}

export async function getPriceAtTime(
  tokenSymbol: string,
  hoursAgo:    number
): Promise<number | null> {
  const targetTime = new Date();
  targetTime.setHours(targetTime.getHours() - hoursAgo);

  const { data, error } = await supabase
    .from("price_snapshots")
    .select("price, captured_at")
    .eq("token", tokenSymbol.toUpperCase())
    .lte("captured_at", targetTime.toISOString())
    .order("captured_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.price;
}

export async function getLatestStoredPrice(
  tokenSymbol: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("price_snapshots")
    .select("price")
    .eq("token", tokenSymbol.toUpperCase())
    .order("captured_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.price;
}

export async function getPriceHistory(
  tokenSymbol: string,
  hours:       number = 24
): Promise<{ price: number; time: string }[]> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const { data, error } = await supabase
    .from("price_snapshots")
    .select("price, captured_at")
    .eq("token", tokenSymbol.toUpperCase())
    .gte("captured_at", since.toISOString())
    .order("captured_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    price: row.price,
    time:  row.captured_at,
  }));
}


export async function checkCondition(
  conditionType:   number,
  conditionValue:  number,   
  conditionWindow: number,   
  tokenSymbol:     string
): Promise<ConditionCheckResult> {

  const mint         = TOKEN_MINTS[tokenSymbol.toUpperCase()];
  const currentPrice = mint ? await getTokenPrice(mint) : null;

  if (!currentPrice) {
    return {
      met:           false,
      reason:        "Could not fetch current price",
      currentPrice:  0,
      previousPrice: null,
      changePercent: null,
    };
  }

  if (conditionType === 0) {
    const targetDropPct = conditionValue / 100; // 500 → 5.00
    const previousPrice = await getPriceAtTime(tokenSymbol, conditionWindow);

    if (!previousPrice) {
      return {
        met:           false,
        reason:        `No price data from ${conditionWindow}h ago yet`,
        currentPrice,
        previousPrice: null,
        changePercent: null,
      };
    }

    const changePct = ((currentPrice - previousPrice) / previousPrice) * 100;
    const dropped   = changePct <= -targetDropPct;

    return {
      met:           dropped,
      reason:        dropped
        ? `${tokenSymbol} dropped ${Math.abs(changePct).toFixed(2)}% in ${conditionWindow}h (threshold: ${targetDropPct}%)`
        : `${tokenSymbol} only changed ${changePct.toFixed(2)}% in ${conditionWindow}h (need: -${targetDropPct}%)`,
      currentPrice,
      previousPrice,
      changePercent: changePct,
    };
  }

  if (conditionType === 1) {
    const targetPrice = conditionValue / 100; 
    const below       = currentPrice < targetPrice;

    return {
      met:           below,
      reason:        below
        ? `${tokenSymbol} is $${currentPrice.toFixed(2)} — below target $${targetPrice.toFixed(2)}`
        : `${tokenSymbol} is $${currentPrice.toFixed(2)} — above target $${targetPrice.toFixed(2)}`,
      currentPrice,
      previousPrice: null,
      changePercent: null,
    };
  }

  if (conditionType === 2) {
    const targetPrice = conditionValue / 100;
    const above       = currentPrice > targetPrice;

    return {
      met:           above,
      reason:        above
        ? `${tokenSymbol} is $${currentPrice.toFixed(2)} — above target $${targetPrice.toFixed(2)}`
        : `${tokenSymbol} is $${currentPrice.toFixed(2)} — below target $${targetPrice.toFixed(2)}`,
      currentPrice,
      previousPrice: null,
      changePercent: null,
    };
  }

  if (conditionType === 3) {
    const today      = new Date().getDay(); 
    const targetDay  = conditionValue;
    const isToday    = today === targetDay;

    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    return {
      met:           isToday,
      reason:        isToday
        ? `Today is ${days[today]} — matches target day`
        : `Today is ${days[today]} — target is ${days[targetDay]}`,
      currentPrice,
      previousPrice: null,
      changePercent: null,
    };
  }

  return {
    met:           false,
    reason:        "Unknown condition type",
    currentPrice,
    previousPrice: null,
    changePercent: null,
  };
}


export async function checkAllActiveStrategies(): Promise<{
  strategyId: string;
  result:     ConditionCheckResult;
}[]> {
  const { data: strategies, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("status", "active");

  if (error || !strategies) return [];

  const results = [];

  for (const strategy of strategies) {
    const tokenSymbol = Object.entries(TOKEN_MINTS).find(
      ([, mint]) => mint === strategy.token_out_mint
    )?.[0] ?? "SOL";

    const result = await checkCondition(
      strategy.condition_type,
      strategy.condition_value,
      strategy.condition_window,
      tokenSymbol
    );

    results.push({
      strategyId: strategy.id,
      result,
    });
  }

  return results;
}