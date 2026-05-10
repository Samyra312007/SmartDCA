/**
 * src/lib/program.ts
 * SmartDCA — Anchor program client for Next.js
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN, Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

// ── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF"
);

export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// ── IDL ─────────────────────────────────────────────────────────────────────
// Anchor 0.30+: "defined" types use { defined: { name: "TypeName" } }

const IDL = {
  address: "4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF",
  version: "0.1.0",
  name: "smart_dca",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "owner",            isMut: true,  isSigner: true  },
        { name: "escrowAccount",    isMut: true,  isSigner: false },
        { name: "usdcTokenAccount", isMut: false, isSigner: false },
        { name: "tokenProgram",     isMut: false, isSigner: false },
        { name: "systemProgram",    isMut: false, isSigner: false },
        { name: "rent",             isMut: false, isSigner: false },
      ],
      args: [
        { name: "condition", type: { defined: { name: "StrategyCondition" } } },
      ],
    },
    {
      name: "deposit",
      accounts: [
        { name: "owner",            isMut: true,  isSigner: true  },
        { name: "escrowAccount",    isMut: true,  isSigner: false },
        { name: "usdcTokenAccount", isMut: true,  isSigner: false },
        { name: "ownerUsdcAccount", isMut: true,  isSigner: false },
        { name: "tokenProgram",     isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "withdraw",
      accounts: [
        { name: "owner",            isMut: true,  isSigner: true  },
        { name: "escrowAccount",    isMut: true,  isSigner: false },
        { name: "usdcTokenAccount", isMut: true,  isSigner: false },
        { name: "ownerUsdcAccount", isMut: true,  isSigner: false },
        { name: "tokenProgram",     isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "setActive",
      accounts: [
        { name: "owner",         isMut: true,  isSigner: true  },
        { name: "escrowAccount", isMut: true,  isSigner: false },
      ],
      args: [{ name: "isActive", type: "bool" }],
    },
    {
      name: "executeTrade",
      accounts: [
        { name: "crank",            isMut: true,  isSigner: true  },
        { name: "escrowAccount",    isMut: true,  isSigner: false },
        { name: "usdcTokenAccount", isMut: true,  isSigner: false },
        { name: "jupiterProgram",   isMut: false, isSigner: false },
        { name: "tokenProgram",     isMut: false, isSigner: false },
        { name: "systemProgram",    isMut: false, isSigner: false },
      ],
      args: [
        { name: "conditionMetProof", type: { defined: { name: "ConditionProof" } } },
      ],
    },
  ],
  accounts: [
    {
      name: "EscrowAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "owner",            type: "pubkey" },
          { name: "usdcTokenAccount", type: "pubkey" },
          { name: "totalDeposited",   type: "u64"       },
          { name: "balance",          type: "u64"       },
          { name: "condition",        type: { defined: { name: "StrategyCondition" } } },
          { name: "lastExecutedAt",   type: "i64"       },
          { name: "executionCount",   type: "u64"       },
          { name: "isActive",         type: "bool"      },
          { name: "bump",             type: "u8"        },
        ],
      },
    },
  ],
  types: [
    {
      name: "StrategyCondition",
      type: {
        kind: "struct",
        fields: [
          { name: "conditionType",   type: { defined: { name: "ConditionType" } } },
          { name: "thresholdBps",    type: "u64"       },
          { name: "tradeAmountUsdc", type: "u64"       },
          { name: "outputMint",      type: "pubkey" },
          { name: "minOutputAmount", type: "u64"       },
        ],
      },
    },
    {
      name: "ConditionType",
      type: {
        kind: "enum",
        variants: [
          { name: "PriceDropPercent"      },
          { name: "RsiBelow"              },
          { name: "WeeklyIfBelowLastWeek" },
        ],
      },
    },
    {
      name: "ConditionProof",
      type: {
        kind: "struct",
        fields: [
          { name: "currentPrice",  type: "u64" },
          { name: "price24hAgo",   type: "u64" },
          { name: "rsi",           type: "u64" },
          { name: "lastWeekPrice", type: "u64" },
          { name: "dayOfWeek",     type: "u64" },
          { name: "timestamp",     type: "i64" },
        ],
      },
    },
  ],
  errors: [],
} as unknown as Idl;

// ── Program factory ──────────────────────────────────────────────────────────

export function getProgram(provider: AnchorProvider): Program {
  return new Program(IDL, provider);
}

// ── PDA helpers ──────────────────────────────────────────────────────────────

export function findEscrowPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export async function findEscrowUsdcAccount(escrowPda: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddress(USDC_MINT, escrowPda, true);
}

export async function findOwnerUsdcAccount(owner: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddress(USDC_MINT, owner, false);
}

// ── Condition type mapper ────────────────────────────────────────────────────

type FrontendConditionType =
  | "price_drop_percent"
  | "price_below"
  | "price_above"
  | "day_of_week";

function mapConditionType(type: FrontendConditionType) {
  switch (type) {
    case "day_of_week": return { weeklyIfBelowLastWeek: {} };
    default:            return { priceDropPercent: {} };
  }
}

// ── buildCreateStrategyTx ────────────────────────────────────────────────────

export async function buildCreateStrategyTx(
  provider:         AnchorProvider,
  conditionTypeStr: FrontendConditionType,
  thresholdBps:     number,
  conditionWindow:  number,
  tradeAmountUsdc:  number,
  outputMint:       string,
): Promise<{ tx: Transaction; escrowPda: PublicKey; escrowUsdc: PublicKey }> {
  const owner      = provider.wallet.publicKey;
  const program    = getProgram(provider);
  const connection = provider.connection;

  const [escrowPda] = findEscrowPDA(owner);
  const escrowUsdc  = await findEscrowUsdcAccount(escrowPda);

  const tx = new Transaction();

  // Create escrow USDC ATA if it doesn't exist
  const escrowUsdcInfo = await connection.getAccountInfo(escrowUsdc);
  if (!escrowUsdcInfo) {
    tx.add(createAssociatedTokenAccountInstruction(owner, escrowUsdc, escrowPda, USDC_MINT));
  }

  const condition = {
    conditionType:   mapConditionType(conditionTypeStr),
    thresholdBps:    new BN(thresholdBps),
    tradeAmountUsdc: new BN(tradeAmountUsdc),
    outputMint:      new PublicKey(outputMint),
    minOutputAmount: new BN(0),
  };

  const initIx = await program.methods
    .initialize(condition)
    .accounts({
      owner,
      escrowAccount:    escrowPda,
      usdcTokenAccount: escrowUsdc,
      tokenProgram:     TOKEN_PROGRAM_ID,
      systemProgram:    SystemProgram.programId,
      rent:             SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  tx.add(initIx);
  return { tx, escrowPda, escrowUsdc };
}

// ── buildDepositTx ───────────────────────────────────────────────────────────

export async function buildDepositTx(
  provider: AnchorProvider,
  amount:   number,
): Promise<{ tx: Transaction; ownerUsdc: PublicKey; escrowUsdc: PublicKey }> {
  const owner      = provider.wallet.publicKey;
  const program    = getProgram(provider);
  const connection = provider.connection;

  const [escrowPda] = findEscrowPDA(owner);
  const escrowUsdc  = await findEscrowUsdcAccount(escrowPda);
  const ownerUsdc   = await findOwnerUsdcAccount(owner);

  const tx = new Transaction();

  // Create owner USDC ATA if it doesn't exist
  const ownerUsdcInfo = await connection.getAccountInfo(ownerUsdc);
  if (!ownerUsdcInfo) {
    tx.add(createAssociatedTokenAccountInstruction(owner, ownerUsdc, owner, USDC_MINT));
  }

  const depositIx = await program.methods
    .deposit(new BN(amount))
    .accounts({
      owner,
      escrowAccount:    escrowPda,
      usdcTokenAccount: escrowUsdc,
      ownerUsdcAccount: ownerUsdc,
      tokenProgram:     TOKEN_PROGRAM_ID,
    })
    .instruction();

  tx.add(depositIx);
  return { tx, ownerUsdc, escrowUsdc };
}

// ── buildWithdrawTx ──────────────────────────────────────────────────────────

export async function buildWithdrawTx(
  provider: AnchorProvider,
  amount:   number,
): Promise<{ tx: Transaction }> {
  const owner   = provider.wallet.publicKey;
  const program = getProgram(provider);

  const [escrowPda] = findEscrowPDA(owner);
  const escrowUsdc  = await findEscrowUsdcAccount(escrowPda);
  const ownerUsdc   = await findOwnerUsdcAccount(owner);

  const withdrawIx = await program.methods
    .withdraw(new BN(amount))
    .accounts({
      owner,
      escrowAccount:    escrowPda,
      usdcTokenAccount: escrowUsdc,
      ownerUsdcAccount: ownerUsdc,
      tokenProgram:     TOKEN_PROGRAM_ID,
    })
    .instruction();

  return { tx: new Transaction().add(withdrawIx) };
}

// ── buildSetActiveTx ─────────────────────────────────────────────────────────

export async function buildSetActiveTx(
  provider: AnchorProvider,
  isActive: boolean,
): Promise<{ tx: Transaction }> {
  const owner   = provider.wallet.publicKey;
  const program = getProgram(provider);

  const [escrowPda] = findEscrowPDA(owner);

  const ix = await program.methods
    .setActive(isActive)
    .accounts({ owner, escrowAccount: escrowPda })
    .instruction();

  return { tx: new Transaction().add(ix) };
}

// ── fetchEscrowAccount ───────────────────────────────────────────────────────

export interface OnChainEscrow {
  owner:            string;
  usdcTokenAccount: string;
  totalDeposited:   number;
  balance:          number;
  isActive:         boolean;
  executionCount:   number;
  lastExecutedAt:   number;
}

export async function fetchEscrowAccount(
  connection: Connection,
  owner:      PublicKey,
): Promise<OnChainEscrow | null> {
  try {
    const readProvider = new AnchorProvider(
      connection,
      {
        publicKey:           owner,
        signTransaction:     async (tx: any) => tx,
        signAllTransactions: async (txs: any) => txs,
      } as any,
      { commitment: "confirmed" }
    );
    const program     = getProgram(readProvider);
    const [escrowPda] = findEscrowPDA(owner);
    const account     = await (program.account as any).escrowAccount.fetch(escrowPda);
    return {
      owner:            account.owner.toString(),
      usdcTokenAccount: account.usdcTokenAccount.toString(),
      totalDeposited:   account.totalDeposited.toNumber(),
      balance:          account.balance.toNumber(),
      isActive:         account.isActive,
      executionCount:   account.executionCount.toNumber(),
      lastExecutedAt:   account.lastExecutedAt.toNumber(),
    };
  } catch {
    return null;
  }
}

// ── signAndSend ──────────────────────────────────────────────────────────────

export async function signAndSend(
  connection:      Connection,
  tx:              Transaction,
  publicKey:       PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer        = publicKey;
  const signed = await signTransaction(tx);
  const sig    = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}