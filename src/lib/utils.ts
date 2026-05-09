import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatTimeAgo(date: string | number | Date) {
  if (!date) return "Never";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function conditionDescription(
  type: string,
  value: number,
  token: string
) {
  switch (type) {
    case "price_drop_percent":
      return `Price of ${token} drops by ${value}%`;
    case "price_below":
      return `Price of ${token} goes below $${value}`;
    case "price_above":
      return `Price of ${token} goes above $${value}`;
    case "day_of_week":
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Every week on ${days[value] || "selected day"}`;
    default:
      return "Unknown condition";
  }
}

export const SUPPORTED_TOKENS = [
  {
    symbol: "SOL",
    name: "Solana",
    mint: "So11111111111111111111111111111111111111112",
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiK68zYJjS44nzxtfCc8v44ctSTm7oHYXW7vK8nd",
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZhfjsC5S76f7C9SWp67mS5Z9p9zB6C9pC2p9zB6",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
];
