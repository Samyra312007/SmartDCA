"use client";

import { useVoiceContext }  from "@/components/voice/VoiceProvider";
import type { Strategy, Trade } from "@/types";

export function useStrategyVoice() {
  const { speak } = useVoiceContext();

  function announceTradeExecuted(
    trade:    Trade,
    strategy: Strategy,
  ) {
    const remainingFunds = strategy.funded_amount
      - strategy.spent_amount
      - trade.amount_in;

    speak("trade_executed", {
      tokenOut:       strategy.token_out,
      amountIn:       trade.amount_in,
      amountOut:      trade.amount_out,
      priceAtTrade:   trade.price_at_trade,
      conditionMet:   trade.condition_met,
      remainingFunds: Math.max(0, remainingFunds),
    }, strategy.id);
  }

  function announceBridgeComplete(
    fromChain: string,
    amount:    number,
    duration:  number,
    strategyId: string,
  ) {
    speak("bridge_complete", {
      fromChain,
      amount,
      duration,
    }, strategyId);
  }

  function announceLowFunds(strategy: Strategy) {
    const remaining      = strategy.funded_amount - strategy.spent_amount;
    const tradesLeft     = Math.floor(remaining / strategy.amount_per_trade);

    if (tradesLeft <= 2) {
      speak("low_funds", {
        tokenOut:        strategy.token_out,
        remainingFunds:  remaining,
        amountPerTrade:  strategy.amount_per_trade,
        tradesRemaining: tradesLeft,
      }, strategy.id);
    }
  }

  function announceStrategyCreated(strategyId: string) {
    speak("strategy_created", {} as any, strategyId);
  }

  function announceDepositConfirmed(strategyId: string) {
    speak("deposit_confirmed", {} as any, strategyId);
  }

  function announceConditionMet(
    strategy:     Strategy,
    currentPrice: number,
  ) {
    speak("condition_met", {
      tokenOut:      strategy.token_out,
      conditionDesc: `${strategy.token_out} triggered your condition`,
      currentPrice,
      amountToSpend: strategy.amount_per_trade / 1_000_000,
    }, strategy.id);
  }

  return {
    announceTradeExecuted,
    announceBridgeComplete,
    announceLowFunds,
    announceStrategyCreated,
    announceDepositConfirmed,
    announceConditionMet,
  };
}