"use client";

import { useState, useCallback }          from "react";
import { useConnection, useWallet }       from "@solana/wallet-adapter-react";
import { VersionedTransaction }           from "@solana/web3.js";
import {
  getSwapQuote,
  buildSwapTransaction,
  executeSwap,
  QuoteResponse,
} from "@/lib/jupiter";

interface SwapState {
  loading:   boolean;
  quote:     QuoteResponse | null;
  txid:      string | null;
  error:     string | null;
}

export function useJupiterSwap() {
  const { connection }                     = useConnection();
  const { publicKey, signTransaction }     = useWallet();

  const [state, setState] = useState<SwapState>({
    loading: false,
    quote:   null,
    txid:    null,
    error:   null,
  });

  const getQuote = useCallback(async (
    inputMint:   string,
    outputMint:  string,
    amount:      number,
    slippageBps: number = 50
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const quote = await getSwapQuote(
        inputMint,
        outputMint,
        amount,
        slippageBps
      );

      setState((prev) => ({
        ...prev,
        loading: false,
        quote,
        error: quote ? null : "Failed to get quote",
      }));

      return quote;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:   err.message,
      }));
      return null;
    }
  }, []);

  const executeSwapWithQuote = useCallback(async (
    quote: QuoteResponse
  ) => {
    if (!publicKey || !signTransaction) {
      setState((prev) => ({
        ...prev,
        error: "Wallet not connected",
      }));
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const transaction = await buildSwapTransaction(
        quote,
        publicKey.toString()
      );

      if (!transaction) throw new Error("Failed to build transaction");

      const txid = await executeSwap(
        connection,
        transaction,
        signTransaction as (tx: VersionedTransaction) => Promise<VersionedTransaction>
      );

      setState((prev) => ({
        ...prev,
        loading: false,
        txid,
        error: txid ? null : "Transaction failed",
      }));

      return txid;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
      return null;
    }
  }, [connection, publicKey, signTransaction]);

  const swap = useCallback(async (
    inputMint:   string,
    outputMint:  string,
    amount:      number,
    slippageBps: number = 50
  ) => {
    const quote = await getQuote(
      inputMint,
      outputMint,
      amount,
      slippageBps
    );
    if (!quote) return null;

    return executeSwapWithQuote(quote);
  }, [getQuote, executeSwapWithQuote]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      quote:   null,
      txid:    null,
      error:   null,
    });
  }, []);

  return {
    ...state,
    getQuote,
    executeSwapWithQuote,
    swap,
    reset,
  };
}