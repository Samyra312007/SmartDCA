import { NextRequest, NextResponse } from "next/server";
import { checkAllActiveStrategies }  from "@/lib/priceTracker";
import { supabase }                  from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const results = await checkAllActiveStrategies();

    const triggered = results.filter((r) => r.result.met);
    const passing   = results.filter((r) => !r.result.met);

    return NextResponse.json({
      total:     results.length,
      triggered: triggered.length,
      passing:   passing.length,
      results,
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
    const body      = await req.json();
    const strategyId = body.strategyId;

    if (!strategyId) {
      return NextResponse.json(
        { error: "strategyId required" },
        { status: 400 }
      );
    }

    const { data: strategy } = await supabase
      .from("strategies")
      .select("*")
      .eq("id", strategyId)
      .single();

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    const { checkCondition } = await import("@/lib/priceTracker");
    const { TOKEN_MINTS }    = await import("@/lib/jupiter");

    const tokenSymbol = Object.entries(TOKEN_MINTS).find(
      ([, mint]) => mint === strategy.token_out_mint
    )?.[0] ?? "SOL";

    const result = await checkCondition(
      strategy.condition_type,
      strategy.condition_value,
      strategy.condition_window,
      tokenSymbol
    );

    if (result.met) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const execRes = await fetch(`${baseUrl}/api/execute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ strategyId }),
      });

      const execData = await execRes.json();
      return NextResponse.json({
        conditionMet: true,
        condition:    result,
        execution:    execData,
      });
    }

    return NextResponse.json({
      conditionMet: false,
      condition:    result,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}