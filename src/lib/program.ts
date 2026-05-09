/**
 * src/lib/program.ts
 *
 * The single connection point between the Next.js frontend
 * and the SmartDCA Anchor program on Solana devnet.
 *
 * Exports:
 *  - PROGRAM_ID         — deployed program address
 *  - USDC_MINT          — devnet USDC mint
 *  - getProgram()       — returns typed Anchor Program instance
 *  - findEscrowPDA()    — derives ["escrow", owner] PDA
 *  - buildCreateStrategyTx() — builds initialize + token-account setup tx
 *  - buildDepositTx()   — builds deposit tx
 *  - buildWithdrawTx()  — builds withdraw tx
 *  - buildSetActiveTx() — builds pause/resume tx
 *  - fetchEscrowAccount() — reads on-chain escrow state
 */

import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    SYSVAR_RENT_PUBKEY,
    Keypair,
  } from "@solana/web3.js";
  import {
    AnchorProvider,
    Program,
    BN,
    Idl,
  } from "@coral-xyz/anchor";
  import {
    TOKEN_PROGRAM_ID,
    createInitializeAccountInstruction,
    getMinimumBalanceForRentExemptAccount,
    ACCOUNT_SIZE,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
  } from "@solana/spl-token";
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  Constants
  // ─────────────────────────────────────────────────────────────────────────────
  
  export const PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF"  // your deployed devnet ID
  );
  
  // Devnet USDC (Circle's official devnet USDC)
  export const USDC_MINT = new PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  IDL  (minimal — just the instructions we call from the frontend)
  //  Copy your full target/idl/smart_dca.json here for production.
  //  For now we use the minimal subset needed by the frontend.
  // ─────────────────────────────────────────────────────────────────────────────
  
  const IDL: Idl = {
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
          {
            name: "condition",
            type: {
              defined: "StrategyCondition",
            },
          },
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
    ],
    accounts: [
      {
        name: "EscrowAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "owner",            type: "publicKey" },
            { name: "usdcTokenAccount", type: "publicKey" },
            { name: "totalDeposited",   type: "u64"       },
            { name: "balance",          type: "u64"       },
            { name: "condition",        type: { defined: "StrategyCondition" } },
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
            { name: "conditionType",    type: { defined: "ConditionType" } },
            { name: "thresholdBps",     type: "u64" },
            { name: "tradeAmountUsdc",  type: "u64" },
            { name: "outputMint",       type: "publicKey" },
            { name: "minOutputAmount",  type: "u64" },
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
    ],
    errors: [],
  } as unknown as Idl;
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  
  /** Returns a typed Program instance bound to the given provider */
  export function getProgram(provider: AnchorProvider): Program {
    // Anchor 0.30+: Program() takes (idl, provider) — programId is set via IDL metadata
    (IDL as any).metadata = { address: PROGRAM_ID.toString() };
    return new Program(IDL, provider);
  }
  
  /**
   * Derive the escrow PDA for a given owner.
   * Seeds: ["escrow", owner]
   */
  export function findEscrowPDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), owner.toBuffer()],
      PROGRAM_ID
    );
  }
  
  /**
   * Find or derive the escrow's USDC token account address.
   * The token account is stored on the EscrowAccount itself,
   * but we need to know it before the account exists (for initialize).
   *
   * We use a deterministic address: the Associated Token Account
   * owned by the escrow PDA. This works because ATAs support PDA owners.
   */
  export async function findEscrowUsdcAccount(
    escrowPda: PublicKey
  ): Promise<PublicKey> {
    return getAssociatedTokenAddress(
      USDC_MINT,
      escrowPda,
      true  // allowOwnerOffCurve = true for PDAs
    );
  }
  
  /**
   * Find the owner's USDC Associated Token Account.
   */
  export async function findOwnerUsdcAccount(
    owner: PublicKey
  ): Promise<PublicKey> {
    return getAssociatedTokenAddress(USDC_MINT, owner, false);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  Map frontend condition types → on-chain enum variants
  // ─────────────────────────────────────────────────────────────────────────────
  
  type FrontendConditionType =
    | "price_drop_percent"
    | "price_below"
    | "price_above"
    | "day_of_week";
  
  function mapConditionType(type: FrontendConditionType) {
    // Our Anchor program has 3 variants.
    // price_below and price_above are handled off-chain via priceTracker;
    // we store them as PriceDropPercent with a note in Supabase.
    // For hackathon demo we map:
    //   price_drop_percent  → PriceDropPercent
    //   price_below         → PriceDropPercent (off-chain checked)
    //   price_above         → PriceDropPercent (off-chain checked)
    //   day_of_week         → WeeklyIfBelowLastWeek
    switch (type) {
      case "price_drop_percent": return { priceDropPercent: {} };
      case "price_below":        return { priceDropPercent: {} };
      case "price_above":        return { priceDropPercent: {} };
      case "day_of_week":        return { weeklyIfBelowLastWeek: {} };
      default:                   return { priceDropPercent: {} };
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  buildCreateStrategyTx
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Builds a transaction that:
   *  1. Creates the escrow's USDC Associated Token Account (if needed)
   *  2. Calls initialize() on the Anchor program
   *
   * @param provider          AnchorProvider with connected wallet
   * @param conditionTypeStr  Frontend condition type string
   * @param thresholdBps      Threshold in basis points (500 = 5%)
   * @param conditionWindow   Hours to look back (24 for 24h)
   * @param tradeAmountUsdc   USDC per trade in smallest units (50 USDC = 50_000_000)
   * @param outputMint        Mint of the token to buy
   */
  export async function buildCreateStrategyTx(
    provider:         AnchorProvider,
    conditionTypeStr: FrontendConditionType,
    thresholdBps:     number,
    conditionWindow:  number,
    tradeAmountUsdc:  number,
    outputMint:       string,
  ): Promise<{
    tx:         Transaction;
    escrowPda:  PublicKey;
    escrowUsdc: PublicKey;
  }> {
    const owner     = provider.wallet.publicKey;
    const program   = getProgram(provider);
    const connection = provider.connection;
  
    const [escrowPda]  = findEscrowPDA(owner);
    const escrowUsdc   = await findEscrowUsdcAccount(escrowPda);
  
    const tx = new Transaction();
  
    // Check if the escrow USDC ATA already exists
    const escrowUsdcInfo = await connection.getAccountInfo(escrowUsdc);
    if (!escrowUsdcInfo) {
      // Create the Associated Token Account for the escrow PDA
      tx.add(
        createAssociatedTokenAccountInstruction(
          owner,       // payer
          escrowUsdc,  // ATA address
          escrowPda,   // owner = the PDA
          USDC_MINT    // mint
        )
      );
    }
  
    // Build the Anchor initialize instruction
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
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  buildDepositTx
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Builds a deposit transaction.
   * Creates owner's USDC ATA if it doesn't exist.
   *
   * @param provider  AnchorProvider with connected wallet
   * @param amount    USDC amount in smallest units (100 USDC = 100_000_000)
   */
  export async function buildDepositTx(
    provider: AnchorProvider,
    amount:   number,
  ): Promise<{
    tx:           Transaction;
    ownerUsdc:    PublicKey;
    escrowUsdc:   PublicKey;
  }> {
    const owner      = provider.wallet.publicKey;
    const program    = getProgram(provider);
    const connection = provider.connection;
  
    const [escrowPda] = findEscrowPDA(owner);
    const escrowUsdc  = await findEscrowUsdcAccount(escrowPda);
    const ownerUsdc   = await findOwnerUsdcAccount(owner);
  
    const tx = new Transaction();
  
    // Create owner's USDC ATA if needed
    const ownerUsdcInfo = await connection.getAccountInfo(ownerUsdc);
    if (!ownerUsdcInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          owner,
          ownerUsdc,
          owner,
          USDC_MINT
        )
      );
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
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  buildWithdrawTx
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Builds a withdraw transaction.
   *
   * @param provider  AnchorProvider with connected wallet
   * @param amount    USDC amount in smallest units to withdraw
   */
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
  
    const tx = new Transaction().add(withdrawIx);
    return { tx };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  buildSetActiveTx
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Pause or resume a strategy.
   */
  export async function buildSetActiveTx(
    provider: AnchorProvider,
    isActive: boolean,
  ): Promise<{ tx: Transaction }> {
    const owner   = provider.wallet.publicKey;
    const program = getProgram(provider);
  
    const [escrowPda] = findEscrowPDA(owner);
  
    const ix = await program.methods
      .setActive(isActive)
      .accounts({
        owner,
        escrowAccount: escrowPda,
      })
      .instruction();
  
    const tx = new Transaction().add(ix);
    return { tx };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  fetchEscrowAccount  (read on-chain state)
  // ─────────────────────────────────────────────────────────────────────────────
  
  export interface OnChainEscrow {
    owner:            string;
    usdcTokenAccount: string;
    totalDeposited:   number;
    balance:          number;
    isActive:         boolean;
    executionCount:   number;
    lastExecutedAt:   number;
  }
  
  /**
   * Fetch and decode the on-chain EscrowAccount for a given owner.
   * Returns null if the account doesn't exist yet.
   */
  export async function fetchEscrowAccount(
    connection: Connection,
    owner:      PublicKey,
  ): Promise<OnChainEscrow | null> {
    try {
      // We need a read-only provider to use the program's fetch method
      const readProvider = new AnchorProvider(
        connection,
        // Dummy wallet — read-only, never signs
        {
          publicKey:       owner,
          signTransaction:      async (tx) => tx,
          signAllTransactions:  async (txs) => txs,
        },
        { commitment: "confirmed" }
      );
  
      const program = getProgram(readProvider);
      const [escrowPda] = findEscrowPDA(owner);
  
      const account = await (program.account as any).escrowAccount.fetch(escrowPda);
  
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
      // Account doesn't exist yet
      return null;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //  Utility: sign + send a Transaction built above
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Signs a Transaction with the connected wallet and sends it.
   * Returns the transaction signature.
   */
  export async function signAndSend(
    connection:      Connection,
    tx:              Transaction,
    publicKey:       PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
  ): Promise<string> {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
  
    tx.recentBlockhash = blockhash;
    tx.feePayer        = publicKey;
  
    const signed = await signTransaction(tx);
    const sig    = await connection.sendRawTransaction(signed.serialize());
  
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
  
    return sig;
  }