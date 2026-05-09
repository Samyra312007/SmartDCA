import { NextRequest, NextResponse } from "next/server";
import {
  getTokenPrice,
  getMultipleTokenPrices,
  TOKEN_MINTS,
} from "@/lib/jupiter";
import { capturePrice, getPriceHistory } from "@/lib/priceTracker";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token   = req.nextUrl.searchParams.get("token");
  const history = req.nextUrl.searchParams.get("history");

  if (!token) {
    return NextResponse.json(
      { error: "token parameter required" },
      { status: 400 }
    );
  }

  try {
    if (token.includes(",")) {
      const symbols = token.split(",").map((s) => s.trim().toUpperCase());
      const mints   = symbols
        .map((s) => TOKEN_MINTS[s])
        .filter(Boolean);

      const prices = await getMultipleTokenPrices(mints);

      const result: Record<string, number> = {};
      for (const symbol of symbols) {
        const mint = TOKEN_MINTS[symbol];
        if (mint && prices[mint]) {
          result[symbol] = prices[mint];
        }
      }

      return NextResponse.json({ prices: result });
    }

    if (history) {
      const hours       = parseInt(history);
      const priceHistory = await getPriceHistory(token.toUpperCase(), hours);
      const current     = await getTokenPrice(TOKEN_MINTS[token.toUpperCase()]);

      return NextResponse.json({
        token:   token.toUpperCase(),
        current,
        history: priceHistory,
      });
    }

    const mint  = TOKEN_MINTS[token.toUpperCase()];
    if (!mint) {
      return NextResponse.json(
        { error: `Unknown token: ${token}` },
        { status: 400 }
      );
    }

    const price = await getTokenPrice(mint);

    const { data: snapshot } = await supabase
      .from("price_snapshots")
      .select("change_24h, change_1h")
      .eq("token", token.toUpperCase())
      .order("captured_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      token:     token.toUpperCase(),
      price,
      change24h: snapshot?.change_24h ?? null,
      change1h:  snapshot?.change_1h ?? null,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json();
    const tokens  = body.tokens ?? ["SOL", "JUP", "BONK", "WIF"];

    const results = await Promise.all(
      tokens.map((token: string) => capturePrice(token))
    );

    return NextResponse.json({
      captured: results.filter(Boolean).length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}