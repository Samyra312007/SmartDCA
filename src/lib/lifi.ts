import { createConfig, EVM, Solana } from "@lifi/sdk";
import { getWalletClient }           from "@wagmi/core";


export function initLiFi() {
  createConfig({
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR ?? "smartdca",

    providers: [
      EVM({

        getWalletClient: () => getWalletClient({} as any),
      }),
      Solana({

        async getWalletAdapter({ name }) {

          return null as any;
        },
      }),
    ],
  });
}


export const CHAIN_IDS = {
  ETHEREUM:  1,
  BASE:      8453,
  ARBITRUM:  42161,
  POLYGON:   137,
  OPTIMISM:  10,
  SOLANA:    1151111081099710, 
} as const;

export type SupportedChain = keyof typeof CHAIN_IDS;


export const CHAIN_USDC: Record<string, string> = {
  ETHEREUM: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  BASE:     "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ARBITRUM: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  POLYGON:  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  OPTIMISM: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  SOLANA:   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export const SOLANA_USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";


export const CHAIN_INFO: Record<string, {
  name:    string;
  logo:    string;
  color:   string;
}> = {
  ETHEREUM: {
    name:  "Ethereum",
    logo:  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
    color: "#627EEA",
  },
  BASE: {
    name:  "Base",
    logo:  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
    color: "#0052FF",
  },
  ARBITRUM: {
    name:  "Arbitrum",
    logo:  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
    color: "#28A0F0",
  },
  POLYGON: {
    name:  "Polygon",
    logo:  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
    color: "#8247E5",
  },
  SOLANA: {
    name:  "Solana",
    logo:  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
    color: "#9945FF",
  },
};