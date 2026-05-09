export const VOICE_IDS = {

  ADAM:    "pNInz6obpgDQGcFmaJgB",

  RACHEL:  "21m00Tcm4TlvDq8ikWAM",

  BELLA:   "EXAVITQu4vr4xnSDxMaL",

  JOSH:    "TxGEqnHWrfWFTfGW9XjX",
} as const;

export const DEFAULT_VOICE_ID = VOICE_IDS.ADAM;


export const VOICE_SETTINGS = {
  stability:         0.75,   
  similarity_boost:  0.75,   
  style:             0.0,    
  use_speaker_boost: true,
};


export type AlertType =
  | "trade_executed"
  | "bridge_complete"
  | "low_funds"
  | "strategy_paused"
  | "condition_met"
  | "strategy_created"
  | "deposit_confirmed"
  | "welcome";

export interface TradeExecutedData {
  tokenOut:       string;   
  amountIn:       number;    
  amountOut:      number;    
  priceAtTrade:   number;    
  conditionMet:   string;    
  remainingFunds: number;    
}

export interface BridgeCompleteData {
  fromChain:    string;    
  amount:       number;    
  duration:     number;    
}

export interface LowFundsData {
  tokenOut:        string;
  remainingFunds:  number;
  amountPerTrade:  number;
  tradesRemaining: number;
}

export interface StrategyPausedData {
  reason:   string;
  tokenOut: string;
}

export interface ConditionMetData {
  tokenOut:      string;
  conditionDesc: string;
  currentPrice:  number;
  amountToSpend: number;
}

export type AlertData =
  | TradeExecutedData
  | BridgeCompleteData
  | LowFundsData
  | StrategyPausedData
  | ConditionMetData;


export function generateAlertScript(
  type: AlertType,
  data: AlertData
): string {
  switch (type) {

    case "trade_executed": {
      const d = data as TradeExecutedData;
      const tradesLeft = Math.floor(d.remainingFunds / d.amountIn);
      return `
        Your ${d.tokenOut} purchase just executed.
        ${d.conditionMet}, triggering your DCA condition.
        You purchased ${d.amountOut.toFixed(4)} ${d.tokenOut}
        for ${d.amountIn.toFixed(2)} USDC
        at a price of $${d.priceAtTrade.toFixed(2)}.
        You have $${d.remainingFunds.toFixed(2)} USDC remaining,
        enough for approximately ${tradesLeft} more trades.
      `.replace(/\s+/g, " ").trim();
    }

    case "bridge_complete": {
      const d = data as BridgeCompleteData;
      const mins = Math.round(d.duration / 60);
      return `
        Bridge complete.
        Your ${d.amount.toFixed(2)} USDC has arrived on Solana
        from ${d.fromChain}.
        The transfer took ${mins} ${mins === 1 ? "minute" : "minutes"}.
        Your funds are now in escrow and your strategy is active.
      `.replace(/\s+/g, " ").trim();
    }

    case "low_funds": {
      const d = data as LowFundsData;
      return `
        Low funds warning for your ${d.tokenOut} strategy.
        You have $${d.remainingFunds.toFixed(2)} USDC remaining,
        which is enough for ${d.tradesRemaining} more 
        ${d.tradesRemaining === 1 ? "trade" : "trades"}.
        Consider topping up your strategy to keep it running.
      `.replace(/\s+/g, " ").trim();
    }

    case "strategy_paused": {
      const d = data as StrategyPausedData;
      return `
        Your ${d.tokenOut} strategy has been paused.
        ${d.reason}.
        You can deposit more USDC or withdraw your
        remaining funds from the dashboard.
      `.replace(/\s+/g, " ").trim();
    }

    case "condition_met": {
      const d = data as ConditionMetData;
      return `
        Condition triggered for your ${d.tokenOut} strategy.
        ${d.conditionDesc}.
        Current price is $${d.currentPrice.toFixed(2)}.
        Executing a purchase of $${d.amountToSpend.toFixed(2)} USDC now.
      `.replace(/\s+/g, " ").trim();
    }

    case "strategy_created": {
      return `
        Your SmartDCA strategy has been created and deployed on Solana.
        Deposit USDC to activate it and start automated trading.
      `.replace(/\s+/g, " ").trim();
    }

    case "deposit_confirmed": {
      return `
        Deposit confirmed. Your strategy is now active
        and will execute trades automatically when
        your conditions are met.
      `.replace(/\s+/g, " ").trim();
    }

    case "welcome": {
      return `
        Welcome to SmartDCA.
        Set your conditions, fund from any chain,
        and let Solana execute your strategy automatically.
      `.replace(/\s+/g, " ").trim();
    }

    default:
      return "SmartDCA notification.";
  }
}


export async function generateSpeech(
  text:    string,
  voiceId: string = DEFAULT_VOICE_ID,
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ElevenLabs API key not set");
    return null;
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":    apiKey,
          "Content-Type":  "application/json",
          "Accept":        "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id:       "eleven_turbo_v2",  
          voice_settings: VOICE_SETTINGS,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs error:", err);
      return null;
    }

    return await res.arrayBuffer();
  } catch (err) {
    console.error("generateSpeech error:", err);
    return null;
  }
}


export async function generateSpeechStream(
  text:    string,
  voiceId: string = DEFAULT_VOICE_ID,
): Promise<ReadableStream | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":    apiKey,
          "Content-Type":  "application/json",
          "Accept":        "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id:       "eleven_turbo_v2",
          voice_settings: VOICE_SETTINGS,
        }),
      }
    );

    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}