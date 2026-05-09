"use client";

import { useEffect, useRef }  from "react";
import { cn }                 from "@/lib/utils";

interface Props {
  isPlaying:    boolean;
  isLoading:    boolean;
  isMuted:      boolean;
  currentText:  string | null;
  queueLength:  number;
  onMuteToggle: () => void;
  onStop:       () => void;
  onReplay:     () => void;
}

export function VoiceAlert({
  isPlaying,
  isLoading,
  isMuted,
  currentText,
  queueLength,
  onMuteToggle,
  onStop,
  onReplay,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const loadingBarHeights = [10, 18, 28, 22, 14];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!isPlaying) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const bars    = 20;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const height = isPlaying
          ? Math.random() * canvas.height * 0.8 + canvas.height * 0.1
          : canvas.height * 0.2;

        const x = i * (barWidth + 2);
        const y = (canvas.height - height) / 2;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#9945FF");
        gradient.addColorStop(1, "#14F195");

        ctx.fillStyle  = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  if (!isPlaying && !isLoading && !currentText) return null;

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50",
      "glass-card rounded-2xl p-4",
      "border border-purple-500/30",
      "shadow-lg shadow-purple-500/10",
      "w-80 transition-all duration-300",
      "animate-fade-in"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isPlaying ? "bg-green-400 animate-pulse" : "bg-gray-500"
          )} />
          <span className="text-xs text-gray-400 font-medium">
            SmartDCA Voice
          </span>
          {queueLength > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 
                           text-purple-300 rounded-full">
              +{queueLength} queued
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onReplay}
            className="p-1.5 rounded-lg hover:bg-white/5 
                     text-gray-400 hover:text-white transition-colors"
            title="Replay"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </button>

          <button
            onClick={onMuteToggle}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isMuted
                ? "bg-red-500/20 text-red-400"
                : "hover:bg-white/5 text-gray-400 hover:text-white"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            )}
          </button>

          <button
            onClick={onStop}
            className="p-1.5 rounded-lg hover:bg-white/5 
                     text-gray-400 hover:text-white transition-colors"
            title="Stop"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="h-10 mb-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-purple-500 rounded-full animate-pulse"
                style={{
                  height:           `${loadingBarHeights[i]}px`,
                  animationDelay:   `${i * 0.1}s`,
                  animationDuration: "0.8s",
                }}
              />
            ))}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={288}
            height={40}
            className="w-full h-full"
          />
        )}
      </div>

      {currentText && (
        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
          {isLoading ? "Generating voice..." : currentText}
        </p>
      )}

      <div className="flex items-center justify-end mt-2">
        <span className="text-xs text-gray-600">
          Powered by ElevenLabs
        </span>
      </div>
    </div>
  );
}
