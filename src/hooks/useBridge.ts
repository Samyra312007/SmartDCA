"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount }   from "wagmi";
import { useWallet }    from "@solana/wallet-adapter-react";
import {
  BridgeRoute,
  BridgeStatus,
  formatBridgeTime,
} from "@/lib/bridge";


interface BridgeState {
  routes:      BridgeRoute[];
  selected:    BridgeRoute | null;
  status:      "idle" | "fetching_routes" | "ready" | "bridging" | "polling" | "done" | "error";
  txHash:      string | null;
  bridgeStatus: BridgeStatus | null;
  error:       string | null;
  recordId:    string | null;
}


export function useBridge(strategyId: string) {
  const { address: evmAddress }    = useAccount();
  const { publicKey: solanaWallet } = useWallet();

  const [state, setState] = useState<BridgeState>({
    routes:       [],
    selected:     null,
    status:       "idle",
    txHash:       null,
    bridgeStatus: null,
    error:        null,
    recordId:     null,
  });


  const fetchRoutes = useCallback(async (
    fromChain:  string,
    fromAmount: string,   
  ) => {
    if (!evmAddress || !solanaWallet) {
      setState((prev) => ({
        ...prev,
        error: "Connect both EVM and Solana wallets",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      status: "fetching_routes",
      error:  null,
      routes: [],
    }));

    try {
      const params = new URLSearchParams({
        action:      "routes",
        fromChain,
        fromAmount,
        fromAddress: evmAddress,
        toAddress:   solanaWallet.toString(),
      });

      const res  = await fetch(`/api/bridge?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setState((prev) => ({
        ...prev,
        routes:   data.routes ?? [],
        selected: data.routes?.[0] ?? null, 
        status:   "ready",
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error:  err.message,
      }));
    }
  }, [evmAddress, solanaWallet]);


  const executeBridge = useCallback(async (
    route:      BridgeRoute,
    fromChain:  string,
    amount:     number,
  ) => {
    if (!evmAddress || !solanaWallet) return;

    setState((prev) => ({ ...prev, status: "bridging", error: null }));

    try {
      const recordRes = await fetch("/api/bridge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:        "record",
          strategyId,
          walletAddress: evmAddress,
          fromChain,
          fromToken:     "USDC",
          amount,
        }),
      });

      const recordData = await recordRes.json();
      const recordId   = recordData.id;

      setState((prev) => ({ ...prev, recordId }));

      setState((prev) => ({
        ...prev,
        status:   "bridging",
        recordId,
      }));

      return recordId;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error:  err.message,
      }));
      return null;
    }
  }, [evmAddress, solanaWallet, strategyId]);

  const onBridgeInitiated = useCallback(async (
    txHash:    string,
    fromChain: string,
  ) => {
    setState((prev) => ({
      ...prev,
      txHash,
      status: "polling",
    }));

    if (state.recordId) {
      await fetch("/api/bridge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:        "update",
          bridgeRecordId: state.recordId,
          status:        "pending",
          lifiTxHash:    txHash,
        }),
      });
    }
  }, [state.recordId]);


  useEffect(() => {
    if (state.status !== "polling" || !state.txHash) return;

    let attempts = 0;
    const MAX_ATTEMPTS = 60; 

    const poll = async () => {
      attempts++;

      try {
        const fromChain = state.selected?.fromChainName ?? "ETH";
        const res       = await fetch(
          `/api/bridge?action=status&txHash=${state.txHash}&fromChain=${fromChain}`
        );
        const data      = await res.json();
        const status    = data.status as BridgeStatus;

        setState((prev) => ({ ...prev, bridgeStatus: status }));

        if (status.status === "done") {
          if (state.recordId) {
            await fetch("/api/bridge", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                action:         "update",
                bridgeRecordId: state.recordId,
                strategyId,
                fromChain,
                amount:         state.selected
                  ? Number(state.selected.fromAmount) / 1e6
                  : 0,
                status:         "done",
                solanaTx:       status.receiving?.txHash,
              }),
            });
          }

          setState((prev) => ({ ...prev, status: "done" }));
          return; 
        }

        if (status.status === "failed") {
          setState((prev) => ({
            ...prev,
            status: "error",
            error:  "Bridge transaction failed",
          }));
          return;
        }

        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 5000); 
        }
      } catch (err) {
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 5000);
        }
      }
    };

    setTimeout(poll, 5000); 
  }, [state.status, state.txHash]);


  const selectRoute = useCallback((route: BridgeRoute) => {
    setState((prev) => ({ ...prev, selected: route }));
  }, []);

  const reset = useCallback(() => {
    setState({
      routes:       [],
      selected:     null,
      status:       "idle",
      txHash:       null,
      bridgeStatus: null,
      error:        null,
      recordId:     null,
    });
  }, []);

  return {
    ...state,
    evmAddress,
    solanaAddress: solanaWallet?.toString(),
    fetchRoutes,
    executeBridge,
    onBridgeInitiated,
    selectRoute,
    reset,
  };
}