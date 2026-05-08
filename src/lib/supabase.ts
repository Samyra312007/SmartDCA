
import { createClient } from "@supabase/supabase-js";
import type { Strategy, Trade } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon);


export async function getStrategiesByWallet(
  walletAddress: string,
): Promise<Strategy[]> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("wallet_address", walletAddress)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getStrategiesByWallet error:", error);
    return [];
  }
  return data as Strategy[];
}

export async function getStrategyById(id: string): Promise<Strategy | null> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Strategy;
}

export async function createStrategy(
  strategy: Partial<Strategy>,
): Promise<Strategy | null> {
  const { data, error } = await supabase
    .from("strategies")
    .insert([strategy])
    .select()
    .single();

  if (error) {
    console.error("createStrategy error:", error);
    return null;
  }
  return data as Strategy;
}

export async function updateStrategy(
  id: string,
  updates: Partial<Strategy>,
): Promise<void> {
  await supabase
    .from("strategies")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
}


export async function getTradesByStrategy(
  strategyId: string,
): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data as Trade[];
}

export async function recordTrade(
  trade: Partial<Trade>,
): Promise<Trade | null> {
  const { data, error } = await supabase
    .from("trades")
    .insert([trade])
    .select()
    .single();

  if (error) {
    console.error("recordTrade error:", error);
    return null;
  }
  return data as Trade;
}