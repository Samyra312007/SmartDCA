import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";


export type ConditionType =
  | "price_drop_percent" 
  | "price_below" 
  | "price_above" 
  | "day_of_week"; 

export type StrategyStatus =
  | "active"
  | "paused"
  | "completed"
  | "insufficient_funds";

export interface Strategy {
  id: string;
  created_at: string;

  wallet_address: string;


  token_in: string; 
  token_in_mint: string;
  token_out: string;
  token_out_mint: string;


  amount_per_trade: number;

  condition_type: ConditionType;
  condition_value: number; 
  condition_window: number; 


  escrow_address: string; 
  program_id: string;
  chain_strategy_id: number;

 
  funded_amount: number; 
  spent_amount: number;

 
  status: StrategyStatus;
  last_triggered: string | null;
  trigger_count: number;

  funded_from_chain: string | null; 
}


export interface Trade {
  id: string;
  created_at: string;
  strategy_id: string;


  condition_met: string; 
  amount_in: number; 
  amount_out: number; 
  price_at_trade: number; 

  tx_signature: string;
  slot: number;

  route_used: string;
  price_impact: number;
}


export interface PriceData {
  token: string;
  price: number;
  change24h: number;
  change1h: number;
  timestamp: number;
}


export interface BridgeQuote {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  tool: string; 
  executionTime: number; 
}


export interface StrategyAccount {
  owner: PublicKey;
  tokenMint: PublicKey;
  depositedAmount: BN;
  spentAmount: BN;
  conditionType: number;
  conditionValue: BN;
  amountPerTrade: BN;
  isActive: boolean;
  tradeCount: BN;
  bump: number;
}


export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}


export interface CreateStrategyForm {
  tokenOut: string;
  tokenOutMint: string;
  amountPerTrade: number;
  conditionType: ConditionType;
  conditionValue: number;
  conditionWindow: number;
  fundingAmount: number;
  fundingChain: string; 
}


export interface VoiceAlert {
  type: "trade_executed" | "condition_met" | "low_funds" | "strategy_complete";
  message: string;
  data: Record<string, any>;
}


export interface Token {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI: string;
}
