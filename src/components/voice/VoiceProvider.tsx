"use client";

import {
  createContext,
  useContext,
  ReactNode,
}                      from "react";
import { useVoice }    from "@/hooks/useVoice";
import { VoiceAlert }  from "./VoiceAlert";
import { AlertType, AlertData } from "@/lib/elevenlabs";


interface VoiceContextType {
  speak:      (type: AlertType, data: AlertData, strategyId?: string) => void;
  stop:       () => void;
  toggleMute: () => void;
  isMuted:    boolean;
  isPlaying:  boolean;
}

const VoiceContext = createContext<VoiceContextType>({
  speak:      () => {},
  stop:       () => {},
  toggleMute: () => {},
  isMuted:    false,
  isPlaying:  false,
});


export function VoiceProvider({ children }: { children: ReactNode }) {
  const voice = useVoice();

  return (
    <VoiceContext.Provider value={{
      speak:      voice.speak,
      stop:       voice.stop,
      toggleMute: voice.toggleMute,
      isMuted:    voice.isMuted,
      isPlaying:  voice.isPlaying,
    }}>
      {children}

      <VoiceAlert
        isPlaying={voice.isPlaying}
        isLoading={voice.isLoading}
        isMuted={voice.isMuted}
        currentText={voice.currentAlert?.script ?? voice.lastPlayed}
        queueLength={voice.queue.length}
        onMuteToggle={voice.toggleMute}
        onStop={voice.stop}
        onReplay={voice.replay}
      />
    </VoiceContext.Provider>
  );
}

export function useVoiceContext() {
  return useContext(VoiceContext);
}