"use client";

import { useEffect, useState } from "react";
import { formatTimeAgo }       from "@/lib/utils";

interface VoiceAlert {
  id:          string;
  created_at:  string;
  alert_type:  string;
  message:     string;
  played:      boolean;
}

interface Props {
  strategyId: string;
  onReplay:   (text: string) => void;
}

const alertTypeIcon: Record<string, string> = {
  trade_executed:   "💱",
  bridge_complete:  "🌉",
  low_funds:        "⚠️",
  strategy_paused:  "⏸️",
  condition_met:    "🎯",
  strategy_created: "✅",
  deposit_confirmed: "💰",
};

export function VoiceHistory({ strategyId, onReplay }: Props) {
  const [alerts, setAlerts] = useState<VoiceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!strategyId) return;

    fetch(`/api/voice?strategyId=${strategyId}`)
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [strategyId]);

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        Loading voice history...
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-6 text-gray-600 text-sm">
        <div className="text-2xl mb-2">🔇</div>
        <p>No voice alerts yet.</p>
        <p className="text-xs mt-1">
          Voice alerts play automatically when events happen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="glass-card rounded-xl p-3 flex items-start gap-3"
        >
          <span className="text-lg flex-shrink-0">
            {alertTypeIcon[alert.alert_type] ?? "🔔"}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
              {alert.message}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {formatTimeAgo(alert.created_at)}
            </p>
          </div>

          <button
            onClick={() => onReplay(alert.message)}
            className="flex-shrink-0 p-1.5 rounded-lg 
                     hover:bg-purple-500/20 text-gray-500 
                     hover:text-purple-400 transition-colors"
            title="Replay this alert"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}