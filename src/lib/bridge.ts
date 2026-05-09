import { supabase }   from "./supabase";


export interface BridgeRoute {
  id:              string;
  fromChainId:     number;
  fromChainName:   string;
  toChainId:       number;
  toChainName:     string;
  fromToken:       string;
  toToken:         string;
  fromAmount:      string;        
  toAmount:        string;        
  toAmountMin:     string;        
  estimatedTime:   number;        
  gasCostUSD:      string;
  feeCostUSD:      string;
  bridgeUsed:      string;        
  steps:           BridgeStep[];
}

export interface BridgeStep {
  type:       string;             
  tool:       string;            
  fromChain:  string;
  toChain:    string;
  fromToken:  string;
  toToken:    string;
  estimate: {
    fromAmount:    string;
    toAmount:      string;
    executionTime: number;
  };
}

export interface BridgeStatus {
  txHash:    string;
  status:    "pending" | "done" | "failed" | "not_found";
  receiving?: {
    txHash:  string;
    amount:  string;
    token:   string;
  };
}


const LIFI_API = "https://li.quest/v1";


export async function getBridgeQuote(
  fromChain:   string,   
  toChain:     string,   
  fromToken:   string,   
  toToken:     string,   
  fromAmount:  string,   
  fromAddress: string,  
  toAddress:   string,   
): Promise<BridgeRoute | null> {
  try {
    const params = new URLSearchParams({
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      integrator: "smartdca",
    });

    const res = await fetch(`${LIFI_API}/quote?${params}`, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("LI.FI quote error:", errText);
      return null;
    }

    const data = await res.json();

    return {
      id:            data.id,
      fromChainId:   data.action.fromChainId,
      fromChainName: fromChain,
      toChainId:     data.action.toChainId,
      toChainName:   toChain,
      fromToken:     data.action.fromToken.symbol,
      toToken:       data.action.toToken.symbol,
      fromAmount:    data.action.fromAmount,
      toAmount:      data.estimate.toAmount,
      toAmountMin:   data.estimate.toAmountMin,
      estimatedTime: data.estimate.executionDuration,
      gasCostUSD:    data.estimate.gasCosts?.[0]?.amountUSD ?? "0",
      feeCostUSD:    data.estimate.feeCosts?.[0]?.amountUSD ?? "0",
      bridgeUsed:    data.steps?.[0]?.toolDetails?.name ?? "LI.FI",
      steps:         data.steps ?? [],
    };
  } catch (err) {
    console.error("getBridgeQuote error:", err);
    return null;
  }
}


export async function getBridgeRoutes(
  fromChain:   string,
  toChain:     string,
  fromToken:   string,
  toToken:     string,
  fromAmount:  string,
  fromAddress: string,
  toAddress:   string,
): Promise<BridgeRoute[]> {
  try {
    const params = new URLSearchParams({
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      integrator:   "smartdca",
      options:      JSON.stringify({
        slippage:   0.005,     
        order:      "FASTEST", 
        maxPriceImpact: 0.4,
      }),
    });

    const res = await fetch(`${LIFI_API}/routes?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    const routes = data.routes ?? [];

    return routes.slice(0, 3).map((route: any) => ({
      id:            route.id,
      fromChainId:   route.fromChainId,
      fromChainName: fromChain,
      toChainId:     route.toChainId,
      toChainName:   toChain,
      fromToken:     route.fromToken.symbol,
      toToken:       route.toToken.symbol,
      fromAmount:    route.fromAmount,
      toAmount:      route.toAmount,
      toAmountMin:   route.toAmountMin,
      estimatedTime: route.steps.reduce(
        (sum: number, s: any) => sum + s.estimate.executionDuration,
        0
      ),
      gasCostUSD:    route.gasCostUSD,
      feeCostUSD:    route.steps[0]?.estimate?.feeCosts?.[0]?.amountUSD ?? "0",
      bridgeUsed:    route.steps[0]?.toolDetails?.name ?? "LI.FI",
      steps:         route.steps,
    }));
  } catch (err) {
    console.error("getBridgeRoutes error:", err);
    return [];
  }
}


export async function checkBridgeStatus(
  txHash:    string,
  fromChain: string,
  toChain:   string,
): Promise<BridgeStatus> {
  try {
    const params = new URLSearchParams({
      txHash,
      fromChain,
      toChain,
      integrator: "smartdca",
    });

    const res = await fetch(`${LIFI_API}/status?${params}`);
    if (!res.ok) {
      return { txHash, status: "not_found" };
    }

    const data = await res.json();

    return {
      txHash,
      status: data.status?.toLowerCase() ?? "pending",
      receiving: data.receiving
        ? {
            txHash:  data.receiving.txHash,
            amount:  data.receiving.amount,
            token:   data.receiving.token?.symbol,
          }
        : undefined,
    };
  } catch (err) {
    console.error("checkBridgeStatus error:", err);
    return { txHash, status: "not_found" };
  }
}


export async function recordBridgeTransaction(data: {
  strategyId:    string;
  walletAddress: string;
  fromChain:     string;
  fromToken:     string;
  amount:        number;
  lifiTxHash?:   string;
}): Promise<string | null> {
  const { data: record, error } = await supabase
    .from("bridge_transactions")
    .insert([{
      strategy_id:   data.strategyId,
      wallet_address: data.walletAddress,
      from_chain:    data.fromChain,
      to_chain:      "solana",
      from_token:    data.fromToken,
      to_token:      "USDC",
      amount:        data.amount,
      lifi_tx_hash:  data.lifiTxHash,
      status:        "pending",
    }])
    .select()
    .single();

  if (error) {
    console.error("recordBridgeTransaction error:", error);
    return null;
  }

  return record.id;
}

export async function updateBridgeStatus(
  id:          string,
  status:      string,
  solanaTx?:   string,
): Promise<void> {
  await supabase
    .from("bridge_transactions")
    .update({
      status,
      solana_tx: solanaTx,
    })
    .eq("id", id);
}

export async function getBridgeHistory(
  walletAddress: string
) {
  const { data, error } = await supabase
    .from("bridge_transactions")
    .select("*")
    .eq("wallet_address", walletAddress)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return data;
}

export function formatBridgeTime(seconds: number): string {
  if (seconds < 60)  return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}min`;
  return `~${Math.round(seconds / 3600)}hr`;
}

export function formatBridgeAmount(
  amount:   string,
  decimals: number
): string {
  const num = Number(amount) / Math.pow(10, decimals);
  return num.toFixed(2);
}