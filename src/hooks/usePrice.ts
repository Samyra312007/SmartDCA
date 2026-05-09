"use client";

import { useState, useEffect, useCallback } from "react";

interface PriceData {
  token:     string;
  price:     number | null;
  change24h: number | null;
  change1h:  number | null;
  loading:   boolean;
  error:     string | null;
}

export function usePrice(tokenSymbol: string): PriceData {
  const [data, setData] = useState<PriceData>({
    token:     tokenSymbol,
    price:     null,
    change24h: null,
    change1h:  null,
    loading:   true,
    error:     null,
  });

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/price?token=${tokenSymbol}`);
      if (!res.ok) throw new Error("Failed to fetch price");

      const json = await res.json();
      setData({
        token:     tokenSymbol,
        price:     json.price,
        change24h: json.change24h,
        change1h:  json.change1h,
        loading:   false,
        error:     null,
      });
    } catch (err: any) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error:   err.message,
      }));
    }
  }, [tokenSymbol]);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30_000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return data;
}

export function useMultiplePrices(
  tokens: string[]
): Record<string, number | null> {
  const [prices, setPrices] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (tokens.length === 0) return;

    const fetchPrices = async () => {
      try {
        const tokenStr = tokens.join(",");
        const res      = await fetch(`/api/price?token=${tokenStr}`);
        if (!res.ok) return;

        const json = await res.json();
        setPrices(json.prices ?? {});
      } catch {
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [tokens.join(",")]);

  return prices;
}