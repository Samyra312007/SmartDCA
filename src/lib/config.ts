/**
 * Central configuration file for SmartDCA
 * All hardcoded values should be moved here for better maintainability
 */

// Environment-specific configuration
export const ENV = {
  IS_DEV: process.env.NODE_ENV !== "production",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet",
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  JUPITER_PRICE: process.env.JUPITER_PRICE_API ?? "https://lite-api.jup.ag/price/v3",
  JUPITER_SWAP: process.env.JUPITER_SWAP_API ?? "https://lite-api.jup.ag/swap/v1",
  LIFI: process.env.LIFI_API ?? "https://li.quest/v1",
} as const;

// Token Configuration
export const TOKEN_CONFIG = {
  USDC: {
    MINT_MAINNET: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    MINT_DEVNET: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    DECIMALS: 6,
  },
  SOL: {
    MINT: "So11111111111111111111111111111111111111112",
    DECIMALS: 9,
  },
  JUP: {
    MINT: "JUPyiK68zYJjS44nzxtfCc8v44ctSTm7oHYXW7vK8nd",
    DECIMALS: 6,
  },
  BONK: {
    MINT: "DezXAZhfjsC5S76f7C9SWp67mS5Z9p9zB6C9pC2p9zB6",
    DECIMALS: 5,
  },
  WIF: {
    MINT: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    DECIMALS: 6,
  },
  PYTH: {
    MINT: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    DECIMALS: 6,
  },
} as const;

// Helper function to get the correct USDC mint based on network
export function getUSDCMint(): string {
  return ENV.SOLANA_NETWORK === "mainnet" 
    ? TOKEN_CONFIG.USDC.MINT_MAINNET 
    : TOKEN_CONFIG.USDC.MINT_DEVNET;
}

// Helper function to get token decimals
export function getTokenDecimals(tokenSymbol: string): number {
  const token = tokenSymbol.toUpperCase() as keyof typeof TOKEN_CONFIG;
  return TOKEN_CONFIG[token]?.DECIMALS ?? 6; // Default to 6 decimals
}

// Swap Configuration
export const SWAP_CONFIG = {
  DEFAULT_SLIPPAGE_BPS: 50, // 0.5%
  MAX_SLIPPAGE_BPS: 500, // 5%
  MIN_SLIPPAGE_BPS: 10, // 0.1%
  WRAP_AND_UNWRAP_SOL: true,
  DYNAMIC_COMPUTE_UNIT_LIMIT: true,
  PRIORITIZATION_FEE_LAMPORTS: 1000,
  SKIP_PREFLIGHT: true,
  MAX_RETRIES: 3,
  PREFLIGHT_COMMITMENT: "confirmed" as const,
} as const;

// Bridge Configuration
export const BRIDGE_CONFIG = {
  INTEGRATOR: "smartdca",
  DEFAULT_TO_CHAIN: "SOL",
  DEFAULT_TO_TOKEN: "USDC",
  DEFAULT_FROM_TOKEN: "USDC",
  DEFAULT_FROM_AMOUNT: "100000000", // 100 USDC (6 decimals)
  SLIPPAGE: 0.005, // 0.5%
  ORDER: "FASTEST" as const,
  MAX_PRICE_IMPACT: 0.4, // 40%
  MAX_ROUTES: 3,
  POLL_INTERVAL_MS: 5000,
  MAX_POLL_ATTEMPTS: 60,
} as const;

// Price Tracking Configuration
export const PRICE_CONFIG = {
  DEFAULT_TOKENS: ["SOL", "JUP", "BONK", "WIF"],
  REVALIDATE_SECONDS: 30,
  POLL_INTERVAL_MS: 30000,
  HISTORY_HOURS: 24,
} as const;

// Strategy Configuration
export const STRATEGY_CONFIG = {
  MIN_AMOUNT_PER_TRADE: 1_000_000, // 1 USDC
  MAX_AMOUNT_PER_TRADE: 10_000_000_000, // 10,000 USDC
  MIN_CONDITION_VALUE: 0.01,
  MAX_CONDITION_VALUE: 100,
  MIN_CONDITION_WINDOW: 1, // 1 hour
  MAX_CONDITION_WINDOW: 168, // 1 week
  COOLDOWN_MINUTES: 60, // 1 hour cooldown between trades
  DEFAULT_CONDITION_WINDOW: 24, // 24 hours
} as const;

// Database Configuration
export const DB_CONFIG = {
  STRATEGY_TABLE: "strategies",
  TRADES_TABLE: "trades",
  PRICE_SNAPSHOTS_TABLE: "price_snapshots",
  BRIDGE_TRANSACTIONS_TABLE: "bridge_transactions",
  VOICE_ALERTS_TABLE: "voice_alerts",
} as const;

// UI Configuration
export const UI_CONFIG = {
  REFRESH_INTERVAL: 30000,
  SKELETON_COUNT: 2,
  MAX_HISTORY_ITEMS: 10,
} as const;

// Transaction Signature Configuration
export const TX_CONFIG = {
  SIMULATED_PREFIX: "sim_",
  DEMO_PREFIX: "demo_sig_",
  SIGNATURE_LENGTH: 88,
} as const;

// Chain Configuration
export const CHAIN_CONFIG = {
  SOLANA: {
    CHAIN_ID: 101,
    NAME: "Solana",
    NATIVE_TOKEN: "SOL",
  },
  ETHEREUM: {
    CHAIN_ID: 1,
    NAME: "Ethereum",
    NATIVE_TOKEN: "ETH",
  },
  BASE: {
    CHAIN_ID: 8453,
    NAME: "Base",
    NATIVE_TOKEN: "ETH",
  },
  POLYGON: {
    CHAIN_ID: 137,
    NAME: "Polygon",
    NATIVE_TOKEN: "MATIC",
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Wallet not connected",
  INSUFFICIENT_FUNDS: "Insufficient funds for transaction",
  TRANSACTION_FAILED: "Transaction failed",
  NETWORK_ERROR: "Network error. Please check your connection.",
  TIMEOUT_ERROR: "Transaction timed out. Please try again.",
  STRATEGY_NOT_FOUND: "Strategy not found",
  INVALID_PARAMETERS: "Invalid parameters provided",
  PRICE_NOT_AVAILABLE: "Could not fetch price",
  QUOTE_FAILED: "Failed to get swap quote",
  BRIDGE_FAILED: "Bridge transaction failed",
} as const;