import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

const JUPITER_PRICE_API = "https://price.jup.ag/v6";
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";

export const TOKEN_MINTS: Record<string, string> = {
  SOL:  "So11111111111111111111111111111111111111112",
  JUP:  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  WIF:  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";


export interface TokenPrice {
  id:                string;
  mintSymbol:        string;
  vsToken:           string;
  vsTokenSymbol:     string;
  price:             number;
  timestamp:         number;
}

export interface PriceResponse {
  data:      Record<string, TokenPrice>;
  timeTaken: number;
}

export interface QuoteResponse {
  inputMint:            string;
  inAmount:             string;
  outputMint:           string;
  outAmount:            string;
  otherAmountThreshold: string;
  swapMode:             string;
  slippageBps:          number;
  platformFee:          null;
  priceImpactPct:       string;
  routePlan:            RoutePlan[];
  contextSlot:          number;
  timeTaken:            number;
}

export interface RoutePlan {
  swapInfo: {
    ammKey:     string;
    label:      string;
    inputMint:  string;
    outputMint: string;
    inAmount:   string;
    outAmount:  string;
    feeAmount:  string;
    feeMint:    string;
  };
  percent: number;
}

export interface SwapRequest {
  quoteResponse:            QuoteResponse;
  userPublicKey:            string;
  wrapAndUnwrapSol:         boolean;
  dynamicComputeUnitLimit:  boolean;
  prioritizationFeeLamports: number;
}

export interface SwapResponse {
  swapTransaction:         string;
  lastValidBlockHeight:    number;
  prioritizationFeeLamports: number;
}

export interface PriceChange {
  current:   number;
  previous:  number;
  changeAbs: number;
  changePct: number;
  window:    string;
}

export async function getTokenPrice(
  tokenMint: string
): Promise<number | null> {
  try {
    const url = `${JUPITER_PRICE_API}/price?ids=${tokenMint}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next:    { revalidate: 30 }, 
    });

    if (!res.ok) throw new Error(`Price API error: ${res.status}`);

    const data: PriceResponse = await res.json();
    const priceData = data.data[tokenMint];

    if (!priceData) return null;
    return priceData.price;
  } catch (err) {
    console.error("getTokenPrice error:", err);
    return null;
  }
}

export async function getMultipleTokenPrices(
  tokenMints: string[]
): Promise<Record<string, number>> {
  try {
    const ids = tokenMints.join(",");
    const url = `${JUPITER_PRICE_API}/price?ids=${ids}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Price API error: ${res.status}`);

    const data: PriceResponse = await res.json();
    const prices: Record<string, number> = {};

    for (const [mint, priceData] of Object.entries(data.data)) {
      prices[mint] = priceData.price;
    }

    return prices;
  } catch (err) {
    console.error("getMultipleTokenPrices error:", err);
    return {};
  }
}

export async function getTokenPriceBySymbol(
  symbol: string
): Promise<number | null> {
  const mint = TOKEN_MINTS[symbol.toUpperCase()];
  if (!mint) return null;
  return getTokenPrice(mint);
}


/**
 * Get best swap quote from Jupiter
 * 
 * @param inputMint   Token to sell (USDC mint)
 * @param outputMint  Token to buy (SOL mint)
 * @param amount      Amount of input token (in smallest units)
 * @param slippageBps Slippage tolerance in basis points (50 = 0.5%)
 */
export async function getSwapQuote(
  inputMint:   string,
  outputMint:  string,
  amount:      number,
  slippageBps: number = 50
): Promise<QuoteResponse | null> {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount:       amount.toString(),
      slippageBps:  slippageBps.toString(),
      swapMode:     "ExactIn",
    });

    const url = `${JUPITER_QUOTE_API}/quote?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Quote API error ${res.status}: ${err}`);
    }

    return await res.json() as QuoteResponse;
  } catch (err) {
    console.error("getSwapQuote error:", err);
    return null;
  }
}

export function formatQuoteOutput(
  quote:      QuoteResponse,
  outputSymbol: string,
  decimals:   number
): string {
  const rawAmount = Number(quote.outAmount);
  const amount    = rawAmount / Math.pow(10, decimals);
  return `${amount.toFixed(6)} ${outputSymbol}`;
}

export function getPriceImpact(quote: QuoteResponse): number {
  return parseFloat(quote.priceImpactPct) * 100;
}


/**
 * Build a swap transaction using Jupiter
 * Returns a VersionedTransaction ready to sign
 * 
 * @param quote         Quote from getSwapQuote()
 * @param userPublicKey User's wallet address
 */
export async function buildSwapTransaction(
  quote:         QuoteResponse,
  userPublicKey: string
): Promise<VersionedTransaction | null> {
  try {
    const swapRequest: SwapRequest = {
      quoteResponse:            quote,
      userPublicKey,
      wrapAndUnwrapSol:         true,   
      dynamicComputeUnitLimit:  true,   
      prioritizationFeeLamports: 1000,  
    };

    const res = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(swapRequest),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Swap API error ${res.status}: ${err}`);
    }

    const swapResponse: SwapResponse = await res.json();

    const swapTransactionBuf = Buffer.from(
      swapResponse.swapTransaction,
      "base64"
    );
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    return transaction;
  } catch (err) {
    console.error("buildSwapTransaction error:", err);
    return null;
  }
}

/**
 * Execute a swap transaction
 * Signs and sends to the network
 * 
 * @param connection  Solana connection
 * @param transaction Built swap transaction
 * @param signTransaction Function from wallet adapter
 */
export async function executeSwap(
  connection:       Connection,
  transaction:      VersionedTransaction,
  signTransaction:  (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<string | null> {
  try {
    const signed = await signTransaction(transaction);

    const rawTransaction = signed.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight:        true,
      maxRetries:           3,
      preflightCommitment:  "confirmed",
    });

    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        blockhash:            latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature:            txid,
      },
      "confirmed"
    );

    return txid;
  } catch (err) {
    console.error("executeSwap error:", err);
    return null;
  }
}

export async function fullSwapPipeline(
  connection:      Connection,
  inputMint:       string,
  outputMint:      string,
  amount:          number,
  userPublicKey:   string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  slippageBps:     number = 50
): Promise<{
  txid:      string | null;
  quote:     QuoteResponse | null;
  error:     string | null;
}> {
  const quote = await getSwapQuote(
    inputMint,
    outputMint,
    amount,
    slippageBps
  );

  if (!quote) {
    return { txid: null, quote: null, error: "Failed to get swap quote" };
  }

  const transaction = await buildSwapTransaction(quote, userPublicKey);
  if (!transaction) {
    return { txid: null, quote, error: "Failed to build swap transaction" };
  }

  const txid = await executeSwap(connection, transaction, signTransaction);
  if (!txid) {
    return { txid: null, quote, error: "Failed to execute swap" };
  }

  return { txid, quote, error: null };
}