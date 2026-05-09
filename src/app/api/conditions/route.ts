import { NextRequest, NextResponse } from "next/server";
import { checkAllActiveStrategies, evaluateCondition } from "@/lib/conditionMonitor";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const results = await checkAllActiveStrategies();

    const triggered = results.results.filter((r) => r.met);
    const passing = results.results.filter((r) => !r.met);

    return NextResponse.json({
      total: results.checked,
      triggered: triggered.length,
      passing: passing.length,
      results: results.results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const strategyId = body.strategyId;

    if (!strategyId) {
      return NextResponse.json({ error: "strategyId required" }, { status: 400 });
    }

    const { data: strategy } = await supabase
      .from("strategies")
      .select("*")
      .eq("id", strategyId)
      .single();

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const result = await evaluateCondition(strategy);

    if (result.met) {
      // In a real production app, we might trigger execution here
      // but for this API we just return the check result.
      return NextResponse.json({
        conditionMet: true,
        condition: result,
      });
    }

    return NextResponse.json({
      conditionMet: false,
      condition: result,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
