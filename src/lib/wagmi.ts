import { getDefaultConfig }  from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum, polygon, optimism } from "wagmi/chains";
import { http } from "wagmi";

export const wagmiConfig = getDefaultConfig({
  appName:   "SmartDCA",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [
    mainnet,
    base,
    arbitrum,
    polygon,
    optimism,
  ],
  transports: {
    [mainnet.id]:  http(),
    [base.id]:     http(),
    [arbitrum.id]: http(),
    [polygon.id]:  http(),
    [optimism.id]: http(),
  },
  ssr: true,
});