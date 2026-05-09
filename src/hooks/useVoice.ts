"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
}                            from "react";
import {
  AlertType,
  AlertData,
  generateAlertScript,
}                            from "@/lib/elevenlabs";


interface QueuedAlert {
  id:         string;
  type:       AlertType;
  data:       AlertData;
  script:     string;
  strategyId?: string;
}

interface VoiceState {
  isPlaying:    boolean;
  isLoading:    boolean;
  isMuted:      boolean;
  currentAlert: QueuedAlert | null;
  queue:        QueuedAlert[];
  error:        string | null;
  lastPlayed:   string | null;    
}


export function useVoice() {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const queueRef    = useRef<QueuedAlert[]>([]);
  const playingRef  = useRef(false);

  const [state, setState] = useState<VoiceState>({
    isPlaying:    false,
    isLoading:    false,
    isMuted:      false,
    currentAlert: null,
    queue:        [],
    error:        null,
    lastPlayed:   null,
  });


  useEffect(() => {
    audioRef.current = new Audio();

    audioRef.current.onended = () => {
      playingRef.current = false;
      setState((prev) => ({
        ...prev,
        isPlaying:    false,
        currentAlert: null,
      }));
      playNextInQueue();
    };

    audioRef.current.onerror = () => {
      playingRef.current = false;
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error:     "Audio playback error",
      }));
      playNextInQueue();
    };

    return () => {
      audioRef.current?.pause();
    };
  }, []);


  const playNextInQueue = useCallback(async () => {
    if (playingRef.current) return;
    if (queueRef.current.length === 0) return;

    const alert = queueRef.current.shift()!;
    queueRef.current = [...queueRef.current];

    setState((prev) => ({
      ...prev,
      isLoading:    true,
      currentAlert: alert,
      queue:        queueRef.current,
    }));

    try {
      const res = await fetch("/api/voice", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type:       alert.type,
          data:       alert.data,
          strategyId: alert.strategyId,
        }),
      });

      if (!res.ok) throw new Error("Voice generation failed");

      const audioBuffer = await res.arrayBuffer();
      const blob        = new Blob([audioBuffer], { type: "audio/mpeg" });
      const url         = URL.createObjectURL(blob);

      if (!audioRef.current) return;

      audioRef.current.src = url;

      audioRef.current.muted = state.isMuted;

      playingRef.current = true;

      setState((prev) => ({
        ...prev,
        isLoading:  false,
        isPlaying:  true,
        lastPlayed: alert.script,
        error:      null,
      }));

      await audioRef.current.play();

      setTimeout(() => URL.revokeObjectURL(url), 30000);

    } catch (err: any) {
      playingRef.current = false;
      setState((prev) => ({
        ...prev,
        isLoading:    false,
        isPlaying:    false,
        currentAlert: null,
        error:        err.message,
      }));
    }
  }, [state.isMuted]);


  const speak = useCallback((
    type:        AlertType,
    data:        AlertData,
    strategyId?: string,
  ) => {
    const script = generateAlertScript(type, data);
    const alert: QueuedAlert = {
      id:         Math.random().toString(36).slice(2),
      type,
      data,
      script,
      strategyId,
    };

    queueRef.current = [...queueRef.current, alert];

    setState((prev) => ({
      ...prev,
      queue: queueRef.current,
    }));

    if (!playingRef.current) {
      playNextInQueue();
    }
  }, [playNextInQueue]);


  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    playingRef.current = false;
    queueRef.current   = [];

    setState((prev) => ({
      ...prev,
      isPlaying:    false,
      isLoading:    false,
      currentAlert: null,
      queue:        [],
    }));
  }, []);


  const toggleMute = useCallback(() => {
    const newMuted = !state.isMuted;
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    setState((prev) => ({ ...prev, isMuted: newMuted }));
  }, [state.isMuted]);


  const replay = useCallback(() => {
    if (!state.lastPlayed || !audioRef.current?.src) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, [state.lastPlayed]);


  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setState((prev) => ({ ...prev, queue: [] }));
  }, []);

  return {
    isPlaying:    state.isPlaying,
    isLoading:    state.isLoading,
    isMuted:      state.isMuted,
    currentAlert: state.currentAlert,
    queue:        state.queue,
    error:        state.error,
    lastPlayed:   state.lastPlayed,

    speak,
    stop,
    toggleMute,
    replay,
    clearQueue,
  };
}