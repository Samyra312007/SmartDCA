import { supabase } from "./supabase";

export async function seedDemoData(walletAddress: string) {
  await supabase
    .from("strategies")
    .delete()
    .eq("wallet_address", walletAddress)
    .eq("status", "active");

  const { data: s1 } = await supabase
    .from("strategies")
    .insert([{
      wallet_address:    walletAddress,
      token_in:          "USDC",
      token_in_mint:     "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      token_out:         "SOL",
      token_out_mint:    "So11111111111111111111111111111111111111112",
      amount_per_trade:  50_000_000,   
      condition_type:    "price_drop_percent",
      condition_value:   500,           
      condition_window:  24,
      funded_amount:     500_000_000,   
      spent_amount:      150_000_000,   
      funded_from_chain: "ethereum",
      status:            "active",
      trigger_count:     3,
      last_triggered:    new Date(
        Date.now() - 2 * 3600 * 1000
      ).toISOString(),
      escrow_address:    "DemoEscrow1111111111111111111111111111111111",
      chain_strategy_id: 1001,
    }])
    .select()
    .single();

  if (s1) {
    await supabase.from("trades").insert([
      {
        strategy_id:    s1.id,
        condition_met:  "SOL dropped 6.2% in 24 hours",
        amount_in:      50,
        amount_out:     0.358,
        price_at_trade: 139.60,
        tx_signature:   "demo_sig_1_" + Date.now(),
        route_used:     "Raydium",
        price_impact:   0.02,
        created_at:     new Date(
          Date.now() - 26 * 3600 * 1000
        ).toISOString(),
      },
      {
        strategy_id:    s1.id,
        condition_met:  "SOL dropped 5.8% in 24 hours",
        amount_in:      50,
        amount_out:     0.347,
        price_at_trade: 144.20,
        tx_signature:   "demo_sig_2_" + Date.now(),
        route_used:     "Orca",
        price_impact:   0.01,
        created_at:     new Date(
          Date.now() - 50 * 3600 * 1000
        ).toISOString(),
      },
      {
        strategy_id:    s1.id,
        condition_met:  "SOL dropped 7.1% in 24 hours",
        amount_in:      50,
        amount_out:     0.374,
        price_at_trade: 133.80,
        tx_signature:   "demo_sig_3_" + Date.now(),
        route_used:     "Jupiter",
        price_impact:   0.03,
        created_at:     new Date(
          Date.now() - 74 * 3600 * 1000
        ).toISOString(),
      },
    ]);
  }

  const { data: s2 } = await supabase
    .from("strategies")
    .insert([{
      wallet_address:    walletAddress,
      token_in:          "USDC",
      token_in_mint:     "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      token_out:         "JUP",
      token_out_mint:    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      amount_per_trade:  25_000_000,   
      condition_type:    "day_of_week",
      condition_value:   1,             
      condition_window:  24,
      funded_amount:     200_000_000,   
      spent_amount:      75_000_000,    
      funded_from_chain: "base",
      status:            "active",
      trigger_count:     3,
      last_triggered:    new Date(
        Date.now() - 7 * 24 * 3600 * 1000
      ).toISOString(),
      escrow_address:    "DemoEscrow2222222222222222222222222222222222",
      chain_strategy_id: 1002,
    }])
    .select()
    .single();

  await supabase.from("strategies").insert([{
    wallet_address:    walletAddress,
    token_in:          "USDC",
    token_in_mint:     "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    token_out:         "BONK",
    token_out_mint:    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    amount_per_trade:  10_000_000,    
    condition_type:    "price_below",
    condition_value:   2,             
    condition_window:  24,
    funded_amount:     100_000_000,   
    spent_amount:      0,
    funded_from_chain: "solana",
    status:            "active",
    trigger_count:     0,
    last_triggered:    null,
    escrow_address:    "DemoEscrow3333333333333333333333333333333333",
    chain_strategy_id: 1003,
  }]);


  const now = Date.now();
  const priceSnapshots = [];

  const solPrices = [
    155.2, 153.8, 151.4, 148.9, 145.2, 143.6, 141.8,
    139.6, 141.2, 143.4, 145.8, 147.2, 148.6, 150.1,
    151.8, 153.2, 154.7, 156.1, 155.4, 154.8, 153.6,
    152.1, 150.8, 149.2,
  ];

  for (let i = 0; i < solPrices.length; i++) {
    priceSnapshots.push({
      token:       "SOL",
      price:       solPrices[i],
      source:      "jupiter",
      captured_at: new Date(now - i * 3600 * 1000).toISOString(),
    });
  }

  if (priceSnapshots.length > 0) {
    await supabase.from("price_snapshots").insert(priceSnapshots);
  }

  return {
    success:    true,
    strategies: 3,
    trades:     3,
  };
}