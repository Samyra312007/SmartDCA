import { NextResponse } from "next/server";
import { supabase }     from "@/lib/supabase";
import {
  getTokenPrice,
  TOKEN_MINTS,
} from "@/lib/jupiter";

export async function POST() {
  try {
    const tokens  = ["SOL", "JUP", "BONK", "WIF"];
    const now     = new Date();
    const records = [];

    for (const token of tokens) {
      const mint  = TOKEN_MINTS[token];
      const price = await getTokenPrice(mint);
      if (!price) continue;

      for (let h = 24; h >= 0; h--) {
        const time = new Date(now.getTime() - h * 60 * 60 * 1000);

        const priceFactor = 1 + (0.06 * h / 24);
        const historicPrice = price * priceFactor;

        records.push({
          token,
          price:      historicPrice,
          change_1h:  -0.25,
          change_24h: -6.0,
          captured_at: time.toISOString(),
          source:     "seed",
        });
      }
    }

    const { error } = await supabase
      .from("price_snapshots")
      .insert(records);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      seeded:  records.length,
      message: "Price history seeded for demo",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}