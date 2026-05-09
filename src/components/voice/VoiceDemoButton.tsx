"use client";

import { useState }           from "react";
import { useVoice }           from "@/hooks/useVoice";
import { VoiceAlert }         from "./VoiceAlert";
import { cn }                 from "@/lib/utils";

const DEMO_SCENARIOS = [
  {
    label:   "Trade Executed",
    emoji:   "💱",
    type:    "trade_executed" as const,
    data:    {
      tokenOut:       "SOL",
      amountIn:       50,
      amountOut:      0.352,
      priceAtTrade:   142.04,
      conditionMet:   "SOL dropped 5.2% in the last 24 hours",
      remainingFunds: 150,
    },
  },
  {
    label:   "Bridge Complete",
    emoji:   "🌉",
    type:    "bridge_complete" as const,
    data:    {
      fromChain: "Ethereum",
      amount:    200,
      duration:  180,
    },
  },
  {
    label:   "Low Funds",
    emoji:   "⚠️",
    type:    "low_funds" as const,
    data:    {
      tokenOut:        "SOL",
      remainingFunds:  35,
      amountPerTrade:  50,
      tradesRemaining: 0,
    },
  },
  {
    label:   "Condition Met",
    emoji:   "🎯",
    type:    "condition_met" as const,
    data:    {
      tokenOut:      "JUP",
      conditionDesc: "JUP dropped 7.3% in the last 24 hours",
      currentPrice:  0.89,
      amountToSpend: 25,
    },
  },
];

export function VoiceDemoButton() {
  const {
    speak,
    stop,
    toggleMute,
    replay,
    isPlaying,
    isLoading,
    isMuted,
    currentAlert,
    queue,
    lastPlayed,
  } = useVoice();

  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  function handleDemo(scenario: typeof DEMO_SCENARIOS[0]) {
    setActiveScenario(scenario.label);
    speak(scenario.type, scenario.data);
    setTimeout(() => setActiveScenario(null), 3000);
  }

  return (
    <>
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎙️</div>
          <div>
            <h3 className="font-semibold text-white">
              Voice Notifications
            </h3>
            <p className="text-xs text-gray-400">
              Powered by ElevenLabs — hear your strategy updates
            </p>
          </div>
          <button
            onClick={toggleMute}
            className={cn(
              "ml-auto px-3 py-1.5 rounded-lg text-xs font-medium",
              "transition-colors",
              isMuted
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-gray-800 text-gray-300 border border-gray-700"
            )}
          >
            {isMuted ? "🔇 Muted" : "🔊 Sound On"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEMO_SCENARIOS.map((scenario) => (
            <button
              key={scenario.label}
              onClick={() => handleDemo(scenario)}
              disabled={isLoading || isPlaying}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl",
                "border text-left transition-all text-sm",
                activeScenario === scenario.label
                  ? "border-purple-500 bg-purple-500/10 text-purple-300"
                  : "border-gray-700 bg-gray-800/50 text-gray-300",
                "hover:border-gray-600 hover:bg-gray-800",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <span className="text-base">{scenario.emoji}</span>
              <span className="font-medium text-xs">{scenario.label}</span>
            </button>
          ))}
        </div>

        {(isLoading || isPlaying) && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isLoading ? "bg-yellow-400 animate-pulse" : "bg-green-400 animate-pulse"
            )} />
            {isLoading ? "Generating voice..." : "Playing..."}

            <button
              onClick={stop}
              className="ml-auto text-gray-500 hover:text-white"
            >
              Stop
            </button>
          </div>
        )}

        <p className="text-xs text-gray-600 text-center">
          Click any scenario to hear a live voice alert
        </p>
      </div>

      <VoiceAlert
        isPlaying={isPlaying}
        isLoading={isLoading}
        isMuted={isMuted}
        currentText={currentAlert?.script ?? lastPlayed}
        queueLength={queue.length}
        onMuteToggle={toggleMute}
        onStop={stop}
        onReplay={replay}
      />
    </>
  );
}