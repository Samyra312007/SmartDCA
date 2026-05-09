import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SmartDca } from "../target/types/smart_dca";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Airdrop SOL and wait for confirmation */
async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol = 10
) {
  const sig = await connection.requestAirdrop(
    pubkey,
    sol * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(sig, "confirmed");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe("SmartDCA", () => {
  // Anchor provider (uses Anchor.toml cluster + wallet)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SmartDca as Program<SmartDca>;
  const connection = provider.connection;

  // Actors
  const owner = Keypair.generate();
  const crank = Keypair.generate(); // the keeper that calls execute_trade

  // Token accounts
  let usdcMint: PublicKey;
  let ownerUsdcAccount: PublicKey;
  let escrowUsdcAccount: PublicKey;

  // PDA
  let escrowPda: PublicKey;
  let escrowBump: number;

  // Constants
  const USDC_DECIMALS = 6;
  const ONE_USDC = new BN(1_000_000); // 1 USDC in smallest units
  const FIFTY_USDC = ONE_USDC.muln(50);
  const HUNDRED_USDC = ONE_USDC.muln(100);

  // ── before: fund wallets, create mint & token accounts ───────────────────

  before(async () => {
    console.log("\n🔧  Setting up wallets and token accounts...");

    // Airdrop to owner and crank
    await airdrop(connection, owner.publicKey);
    await airdrop(connection, crank.publicKey);

    // Create a fake USDC mint (6 decimals, owner is mint authority)
    usdcMint = await createMint(
      connection,
      owner,          // payer
      owner.publicKey, // mint authority
      null,           // freeze authority
      USDC_DECIMALS
    );
    console.log("  USDC mint:", usdcMint.toBase58());

    // Derive escrow PDA
    [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), owner.publicKey.toBuffer()],
      program.programId
    );
    console.log("  Escrow PDA:", escrowPda.toBase58());

    // Create owner's USDC token account
    ownerUsdcAccount = await createAccount(
      connection,
      owner,
      usdcMint,
      owner.publicKey
    );

    // Create escrow's USDC token account — owned by the PDA
    escrowUsdcAccount = await createAccount(
      connection,
      owner,         // payer
      usdcMint,
      escrowPda,     // owner = PDA so the program can sign transfers
      Keypair.generate()
    );
    console.log("  Escrow USDC account:", escrowUsdcAccount.toBase58());

    // Mint 1000 USDC to owner
    await mintTo(
      connection,
      owner,
      usdcMint,
      ownerUsdcAccount,
      owner,
      1000 * 10 ** USDC_DECIMALS
    );
    console.log("  ✅  Minted 1000 USDC to owner\n");
  });

  // ── 1. initialize ─────────────────────────────────────────────────────────

  it("✅  initialize — creates escrow with PriceDropPercent condition", async () => {
    // Condition: buy $50 USDC of SOL when price drops 5% in 24h
    const condition = {
      conditionType: { priceDropPercent: {} },
      thresholdBps: new BN(500),        // 5.00%
      tradeAmountUsdc: FIFTY_USDC,
      outputMint: anchor.web3.SystemProgram.programId, // placeholder; real = SOL mint
      minOutputAmount: new BN(0),
    };

    await program.methods
      .initialize(condition)
      .accounts({
        owner: owner.publicKey,
        escrowAccount: escrowPda,
        usdcTokenAccount: escrowUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();

    // Fetch and verify
    const escrow = await program.account.escrowAccount.fetch(escrowPda);

    assert.ok(escrow.owner.equals(owner.publicKey), "owner mismatch");
    assert.ok(
      escrow.usdcTokenAccount.equals(escrowUsdcAccount),
      "token account mismatch"
    );
    assert.equal(escrow.balance.toNumber(), 0, "initial balance should be 0");
    assert.equal(escrow.executionCount.toNumber(), 0);
    assert.equal(escrow.isActive, true, "should be active on init");
    assert.equal(escrow.bump, escrowBump);
    assert.deepEqual(escrow.condition.conditionType, { priceDropPercent: {} });
    assert.equal(escrow.condition.thresholdBps.toNumber(), 500);

    console.log("    Escrow initialized ✓");
  });

  // ── 2. deposit ────────────────────────────────────────────────────────────

  it("✅  deposit — transfers USDC from owner to escrow", async () => {
    const depositAmount = HUNDRED_USDC; // 100 USDC

    const ownerBefore = await getAccount(connection, ownerUsdcAccount);
    const escrowBefore = await getAccount(connection, escrowUsdcAccount);

    await program.methods
      .deposit(depositAmount)
      .accounts({
        owner: owner.publicKey,
        escrowAccount: escrowPda,
        usdcTokenAccount: escrowUsdcAccount,
        ownerUsdcAccount: ownerUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    const ownerAfter = await getAccount(connection, ownerUsdcAccount);
    const escrowAfter = await getAccount(connection, escrowUsdcAccount);
    const escrow = await program.account.escrowAccount.fetch(escrowPda);

    // Token balances
    assert.equal(
      Number(ownerAfter.amount),
      Number(ownerBefore.amount) - depositAmount.toNumber(),
      "owner USDC should decrease"
    );
    assert.equal(
      Number(escrowAfter.amount),
      Number(escrowBefore.amount) + depositAmount.toNumber(),
      "escrow USDC should increase"
    );

    // On-chain bookkeeping
    assert.equal(
      escrow.balance.toNumber(),
      depositAmount.toNumber(),
      "escrow.balance should match deposit"
    );
    assert.equal(
      escrow.totalDeposited.toNumber(),
      depositAmount.toNumber()
    );

    console.log("    Deposited 100 USDC ✓");
  });

  it("❌  deposit — rejects zero amount", async () => {
    try {
      await program.methods
        .deposit(new BN(0))
        .accounts({
          owner: owner.publicKey,
          escrowAccount: escrowPda,
          usdcTokenAccount: escrowUsdcAccount,
          ownerUsdcAccount: ownerUsdcAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();
      assert.fail("should have thrown");
    } catch (err: any) {
      assert.include(err.toString(), "InsufficientBalance");
      console.log("    Correctly rejected zero deposit ✓");
    }
  });

  // ── 3. set_active ─────────────────────────────────────────────────────────

  it("✅  set_active — can pause and resume strategy", async () => {
    // Pause
    await program.methods
      .setActive(false)
      .accounts({
        owner: owner.publicKey,
        escrowAccount: escrowPda,
      })
      .signers([owner])
      .rpc();

    let escrow = await program.account.escrowAccount.fetch(escrowPda);
    assert.equal(escrow.isActive, false, "should be paused");

    // Resume
    await program.methods
      .setActive(true)
      .accounts({
        owner: owner.publicKey,
        escrowAccount: escrowPda,
      })
      .signers([owner])
      .rpc();

    escrow = await program.account.escrowAccount.fetch(escrowPda);
    assert.equal(escrow.isActive, true, "should be active again");
    console.log("    Pause/resume works ✓");
  });

  // ── 4. execute_trade — condition checks ───────────────────────────────────

  it("✅  execute_trade — fires when PriceDropPercent condition met", async () => {
    const now = Math.floor(Date.now() / 1000);

    // SOL was $150 yesterday, now $141.80 → 5.47% drop (> 5% threshold)
    const proof = {
      currentPrice: new BN(141_800_000),   // $141.80
      price24HAgo: new BN(150_000_000),    // $150.00
      rsi: new BN(45),
      lastWeekPrice: new BN(148_000_000),
      dayOfWeek: new BN(1),               // Monday
      timestamp: new BN(now),
    };

    const escrowBefore = await program.account.escrowAccount.fetch(escrowPda);

    await program.methods
      .executeTrade(proof)
      .accounts({
        crank: crank.publicKey,
        escrowAccount: escrowPda,
        usdcTokenAccount: escrowUsdcAccount,
        jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts([]) // empty → demo mode (no real Jupiter swap)
      .signers([crank])
      .rpc();

    const escrowAfter = await program.account.escrowAccount.fetch(escrowPda);

    assert.equal(
      escrowAfter.balance.toNumber(),
      escrowBefore.balance.toNumber() - FIFTY_USDC.toNumber(),
      "balance should decrease by trade amount"
    );
    assert.equal(
      escrowAfter.executionCount.toNumber(),
      escrowBefore.executionCount.toNumber() + 1,
      "execution count should increment"
    );
    assert.isAbove(
      escrowAfter.lastExecutedAt.toNumber(),
      0,
      "lastExecutedAt should be set"
    );

    console.log("    Trade executed ✓  |  executions:", escrowAfter.executionCount.toNumber());
  });

  it("❌  execute_trade — rejects when condition NOT met (drop < threshold)", async () => {
    const now = Math.floor(Date.now() / 1000);

    // Only 2% drop — below 5% threshold
    const proof = {
      currentPrice: new BN(147_000_000),  // $147
      price24HAgo: new BN(150_000_000),   // $150
      rsi: new BN(45),
      lastWeekPrice: new BN(148_000_000),
      dayOfWeek: new BN(1),
      timestamp: new BN(now),
    };

    try {
      await program.methods
        .executeTrade(proof)
        .accounts({
          crank: crank.publicKey,
          escrowAccount: escrowPda,
          usdcTokenAccount: escrowUsdcAccount,
          jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([])
        .signers([crank])
        .rpc();
      assert.fail("should have thrown ConditionNotMet");
    } catch (err: any) {
      assert.include(err.toString(), "ConditionNotMet");
      console.log("    Correctly rejected: drop below threshold ✓");
    }
  });

  it("❌  execute_trade — rejects stale proof (>60s old)", async () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 120; // 2 min ago

    const proof = {
      currentPrice: new BN(141_000_000),
      price24HAgo: new BN(150_000_000),
      rsi: new BN(45),
      lastWeekPrice: new BN(148_000_000),
      dayOfWeek: new BN(1),
      timestamp: new BN(staleTimestamp),
    };

    try {
      await program.methods
        .executeTrade(proof)
        .accounts({
          crank: crank.publicKey,
          escrowAccount: escrowPda,
          usdcTokenAccount: escrowUsdcAccount,
          jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([])
        .signers([crank])
        .rpc();
      assert.fail("should have thrown StalePriceProof");
    } catch (err: any) {
      assert.include(err.toString(), "StalePriceProof");
      console.log("    Correctly rejected: stale proof ✓");
    }
  });

  it("❌  execute_trade — rejects when strategy is paused", async () => {
    // Pause first
    await program.methods
      .setActive(false)
      .accounts({ owner: owner.publicKey, escrowAccount: escrowPda })
      .signers([owner])
      .rpc();

    const now = Math.floor(Date.now() / 1000);
    const proof = {
      currentPrice: new BN(141_000_000),
      price24HAgo: new BN(150_000_000),
      rsi: new BN(45),
      lastWeekPrice: new BN(148_000_000),
      dayOfWeek: new BN(1),
      timestamp: new BN(now),
    };

    try {
      await program.methods
        .executeTrade(proof)
        .accounts({
          crank: crank.publicKey,
          escrowAccount: escrowPda,
          usdcTokenAccount: escrowUsdcAccount,
          jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([])
        .signers([crank])
        .rpc();
      assert.fail("should have thrown StrategyInactive");
    } catch (err: any) {
      assert.include(err.toString(), "StrategyInactive");
      console.log("    Correctly rejected: strategy paused ✓");
    }

    // Restore active for remaining tests
    await program.methods
      .setActive(true)
      .accounts({ owner: owner.publicKey, escrowAccount: escrowPda })
      .signers([owner])
      .rpc();
  });

  // ── 5. withdraw ───────────────────────────────────────────────────────────

  it("✅  withdraw — owner can pull remaining USDC back", async () => {
    const escrowBefore = await program.account.escrowAccount.fetch(escrowPda);
    const withdrawAmount = escrowBefore.balance; // withdraw everything left

    const ownerBefore = await getAccount(connection, ownerUsdcAccount);

    await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        owner: owner.publicKey,
        escrowAccount: escrowPda,
        usdcTokenAccount: escrowUsdcAccount,
        ownerUsdcAccount: ownerUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    const ownerAfter = await getAccount(connection, ownerUsdcAccount);
    const escrowAfter = await program.account.escrowAccount.fetch(escrowPda);

    assert.equal(
      Number(ownerAfter.amount),
      Number(ownerBefore.amount) + withdrawAmount.toNumber(),
      "owner should receive withdrawn USDC"
    );
    assert.equal(escrowAfter.balance.toNumber(), 0, "escrow balance should be 0");
    console.log("    Withdrew remaining USDC ✓");
  });

  it("❌  withdraw — rejects overdraft", async () => {
    try {
      await program.methods
        .withdraw(new BN(999_000_000)) // more than balance (0 right now)
        .accounts({
          owner: owner.publicKey,
          escrowAccount: escrowPda,
          usdcTokenAccount: escrowUsdcAccount,
          ownerUsdcAccount: ownerUsdcAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();
      assert.fail("should have thrown WithdrawTooLarge");
    } catch (err: any) {
      assert.include(err.toString(), "WithdrawTooLarge");
      console.log("    Correctly rejected: overdraft ✓");
    }
  });

  // ── 6. RSI condition test ─────────────────────────────────────────────────

  it("✅  RSI condition — fires when RSI < threshold", async () => {
    // Re-initialize with RSI condition
    const rsiOwner = Keypair.generate();
    await airdrop(connection, rsiOwner.publicKey);

    const [rsiEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), rsiOwner.publicKey.toBuffer()],
      program.programId
    );

    const rsiEscrowUsdc = await createAccount(
      connection, rsiOwner, usdcMint, rsiEscrowPda, Keypair.generate()
    );
    const rsiOwnerUsdc = await createAccount(
      connection, rsiOwner, usdcMint, rsiOwner.publicKey
    );
    await mintTo(connection, owner, usdcMint, rsiOwnerUsdc, owner, 500 * 10 ** USDC_DECIMALS);

    // Init with RsiBelow condition (threshold = 30)
    const condition = {
      conditionType: { rsiBelow: {} },
      thresholdBps: new BN(30),
      tradeAmountUsdc: ONE_USDC.muln(100),
      outputMint: anchor.web3.SystemProgram.programId,
      minOutputAmount: new BN(0),
    };

    await program.methods
      .initialize(condition)
      .accounts({
        owner: rsiOwner.publicKey,
        escrowAccount: rsiEscrowPda,
        usdcTokenAccount: rsiEscrowUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([rsiOwner])
      .rpc();

    // Deposit 200 USDC
    await program.methods
      .deposit(ONE_USDC.muln(200))
      .accounts({
        owner: rsiOwner.publicKey,
        escrowAccount: rsiEscrowPda,
        usdcTokenAccount: rsiEscrowUsdc,
        ownerUsdcAccount: rsiOwnerUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([rsiOwner])
      .rpc();

    // Fire with RSI = 25 (< 30 threshold)
    const now = Math.floor(Date.now() / 1000);
    const proof = {
      currentPrice: new BN(141_000_000),
      price24HAgo: new BN(150_000_000),
      rsi: new BN(25),   // ← below threshold of 30
      lastWeekPrice: new BN(148_000_000),
      dayOfWeek: new BN(1),
      timestamp: new BN(now),
    };

    await program.methods
      .executeTrade(proof)
      .accounts({
        crank: crank.publicKey,
        escrowAccount: rsiEscrowPda,
        usdcTokenAccount: rsiEscrowUsdc,
        jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts([])
      .signers([crank])
      .rpc();

    const escrow = await program.account.escrowAccount.fetch(rsiEscrowPda);
    assert.equal(escrow.executionCount.toNumber(), 1);
    console.log("    RSI condition fired ✓");
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  after(async () => {
    const escrow = await program.account.escrowAccount.fetch(escrowPda);
    console.log("\n📊  Final escrow state:");
    console.log("    balance:        ", escrow.balance.toNumber());
    console.log("    totalDeposited: ", escrow.totalDeposited.toNumber());
    console.log("    executionCount: ", escrow.executionCount.toNumber());
    console.log("    isActive:       ", escrow.isActive);
  });
});
