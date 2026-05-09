import { NextRequest, NextResponse } from "next/server";
import {
  getBridgeRoutes,
  getBridgeQuote,
  recordBridgeTransaction,
  updateBridgeStatus,
  checkBridgeStatus,
  getBridgeHistory,
} from "@/lib/bridge";
import { supabase } from "@/lib/supabase";


export async function GET(req: NextRequest) {
  const action    = req.nextUrl.searchParams.get("action");
  const wallet    = req.nextUrl.searchParams.get("wallet");
  const txHash    = req.nextUrl.searchParams.get("txHash");
  const fromChain = req.nextUrl.searchParams.get("fromChain");
  const toChain   = req.nextUrl.searchParams.get("toChain") ?? "SOL";

  try {
    if (action === "status" && txHash && fromChain) {
      const status = await checkBridgeStatus(txHash, fromChain, toChain);
      return NextResponse.json({ status });
    }

    if (action === "history" && wallet) {
      const history = await getBridgeHistory(wallet);
      return NextResponse.json({ history });
    }

    if (action === "routes") {
      const fromToken    = req.nextUrl.searchParams.get("fromToken")    ?? "USDC";
      const fromAmount   = req.nextUrl.searchParams.get("fromAmount")   ?? "100000000";
      const fromAddress  = req.nextUrl.searchParams.get("fromAddress")  ?? "";
      const toAddress    = req.nextUrl.searchParams.get("toAddress")    ?? "";

      if (!fromChain || !fromAddress || !toAddress) {
        return NextResponse.json(
          { error: "fromChain, fromAddress, toAddress required" },
          { status: 400 }
        );
      }

      const routes = await getBridgeRoutes(
        fromChain,
        toChain,
        fromToken,
        "USDC",
        fromAmount,
        fromAddress,
        toAddress,
      );

      return NextResponse.json({ routes });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      strategyId,
      walletAddress,
      fromChain,
      fromToken,
      amount,
      lifiTxHash,
      bridgeRecordId,
      status,
      solanaTx,
    } = body;

    if (action === "record") {
      if (!strategyId || !walletAddress || !fromChain || !amount) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const id = await recordBridgeTransaction({
        strategyId,
        walletAddress,
        fromChain,
        fromToken:   fromToken ?? "USDC",
        amount,
        lifiTxHash,
      });

      return NextResponse.json({ id, success: !!id });
    }

    if (action === "update" && bridgeRecordId) {
      await updateBridgeStatus(bridgeRecordId, status, solanaTx);

      if (status === "done" && strategyId && amount) {
        const { data: strategy } = await supabase
          .from("strategies")
          .select("funded_amount")
          .eq("id", strategyId)
          .single();

        if (strategy) {
          await supabase
            .from("strategies")
            .update({
              funded_amount:     strategy.funded_amount + amount,
              funded_from_chain: fromChain,
              updated_at:        new Date().toISOString(),
            })
            .eq("id", strategyId);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}