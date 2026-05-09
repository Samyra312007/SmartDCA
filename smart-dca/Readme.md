# SmartDCA — Anchor Program

> Conditional Dollar-Cost Averaging on Solana  
> Fund from any chain · Execute on Solana · Get voice alerts when trades fire

**Devnet Program ID:** `4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF`  
**Explorer:** https://explorer.solana.com/address/4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF?cluster=devnet

---

## What is SmartDCA?

Most DCA tools buy on a fixed schedule — every day, every week, regardless of market conditions. SmartDCA lets you set **conditions** instead of schedules:

- *"Buy $50 of SOL only when it drops 5% in 24 hours"*
- *"Buy $100 of JUP when RSI falls below 30"*
- *"Buy $25 of BONK every Monday if price is below last week's price"*

Funds are deposited once from **any blockchain** (via LI.FI bridge), sit in an **on-chain escrow**, and trades execute automatically on Solana via **Jupiter** the moment conditions are met. A voice notification via **ElevenLabs** fires after every trade.

---

## Architecture

```
User (any chain)
    │
    ▼
LI.FI Bridge ──── bridges USDC to Solana
    │
    ▼
Anchor Escrow PDA ◄──── Helius webhook monitors price
    │                         │
    │              condition met?
    │                    YES ▼
    └──────────► Jupiter CPI (swap USDC → token)
                       │
                       ▼
              ElevenLabs voice alert
```

---

## Anchor Program — What We Built

### File Structure

```
programs/smart-dca/src/
├── lib.rs                    # Program entry point, all instructions declared
├── state.rs                  # On-chain account structures
├── errors.rs                 # Custom error codes
└── instructions/
    ├── mod.rs
    ├── initialize.rs         # Create escrow + store strategy
    ├── deposit.rs            # Fund the escrow
    ├── withdraw.rs           # Pull funds back
    ├── execute_trade.rs      # Verify condition + CPI to Jupiter
    └── set_active.rs         # Pause / resume strategy
```

---

### On-Chain Account: `EscrowAccount`

One PDA per user strategy. Derived from `["escrow", owner_pubkey]`.

| Field | Type | Description |
|-------|------|-------------|
| `owner` | `Pubkey` | Wallet that controls this escrow |
| `usdc_token_account` | `Pubkey` | SPL token account holding deposited USDC |
| `total_deposited` | `u64` | Lifetime USDC deposited (informational) |
| `balance` | `u64` | USDC available for trades right now |
| `condition` | `StrategyCondition` | The DCA trigger config |
| `last_executed_at` | `i64` | Unix timestamp of last trade |
| `execution_count` | `u64` | How many trades have fired |
| `is_active` | `bool` | Pause/resume flag |
| `bump` | `u8` | PDA bump seed |

### On-Chain Struct: `StrategyCondition`

| Field | Type | Description |
|-------|------|-------------|
| `condition_type` | `ConditionType` | Which trigger logic to use |
| `threshold_bps` | `u64` | Threshold value (basis points, RSI integer, or day-of-week) |
| `trade_amount_usdc` | `u64` | USDC to spend per trigger (in smallest units, 6 decimals) |
| `output_mint` | `Pubkey` | Token to buy (SOL, JUP, BONK, etc.) |
| `min_output_amount` | `u64` | Slippage guard — minimum tokens to receive |

### Condition Types

| Variant | `threshold_bps` means | Fires when |
|---------|-----------------------|------------|
| `PriceDropPercent` | basis points (500 = 5%) | price dropped ≥ threshold% in 24h |
| `RsiBelow` | RSI integer (e.g. 30) | current RSI < threshold |
| `WeeklyIfBelowLastWeek` | day of week (0=Sun…6=Sat) | it's that day AND price < last week |

---

### Instructions

#### `initialize(condition: StrategyCondition)`
Creates the escrow PDA and stores the DCA strategy on-chain.

```
Accounts: owner (signer), escrow_account (PDA, init), usdc_token_account, 
          token_program, system_program, rent
```

#### `deposit(amount: u64)`
Transfers USDC from the owner's wallet into the escrow token account. Updates `balance` and `total_deposited`.

```
Accounts: owner (signer), escrow_account, usdc_token_account (escrow), 
          owner_usdc_account (source), token_program
```

#### `withdraw(amount: u64)`
Owner pulls USDC back out. The escrow PDA signs the transfer.

```
Accounts: owner (signer), escrow_account, usdc_token_account (escrow),
          owner_usdc_account (destination), token_program
```

#### `execute_trade(proof: ConditionProof)`
The heart of the program. Called by the off-chain keeper/crank when a condition fires.

1. Checks proof is fresh (< 60 seconds old)
2. Checks strategy is active
3. Checks sufficient balance
4. Enforces 1-hour cooldown between trades
5. Verifies the condition on-chain using the proof data
6. Debits `balance` by `trade_amount_usdc`
7. CPIs to Jupiter to execute the swap

```
Accounts: crank (signer), escrow_account, usdc_token_account,
          jupiter_program, token_program, system_program
          + remaining_accounts (Jupiter route accounts, passed by crank)
```

#### `set_active(is_active: bool)`
Owner can pause or resume a strategy at any time. A paused strategy rejects `execute_trade` calls.

```
Accounts: owner (signer), escrow_account
```

---

### `ConditionProof` (passed by the keeper)

The off-chain keeper fetches price data from Helius/Pyth, builds this struct, and passes it to `execute_trade`. The program validates it on-chain.

```rust
pub struct ConditionProof {
    pub current_price: u64,    // USD price × 1_000_000  (e.g. $141.80 → 141_800_000)
    pub price_24h_ago: u64,    // 24h-ago price, same scale
    pub rsi: u64,              // RSI integer (0–100)
    pub last_week_price: u64,  // Last week's price, same scale
    pub day_of_week: u64,      // 0 = Sunday … 6 = Saturday
    pub timestamp: i64,        // Unix timestamp — must be within 60s of on-chain clock
}
```

---

### Error Codes

| Error | Description |
|-------|-------------|
| `InsufficientBalance` | Escrow balance < trade amount |
| `StrategyInactive` | Strategy is paused |
| `ConditionNotMet` | Price/RSI/day condition not satisfied |
| `Unauthorized` | Caller is not the escrow owner |
| `WithdrawTooLarge` | Withdrawal exceeds available balance |
| `CooldownNotElapsed` | Less than 1 hour since last trade |
| `StalePriceProof` | Proof timestamp is > 60 seconds old |
| `Overflow` | Arithmetic overflow |

---

## Test Suite

11 tests covering all instructions and edge cases:

```
✅  initialize — creates escrow with PriceDropPercent condition
✅  deposit — transfers USDC from owner to escrow
❌  deposit — rejects zero amount
✅  set_active — can pause and resume strategy
✅  execute_trade — fires when PriceDropPercent condition met
❌  execute_trade — rejects when condition NOT met (drop < threshold)
❌  execute_trade — rejects stale proof (>60s old)
❌  execute_trade — rejects when strategy is paused
✅  withdraw — owner can pull remaining USDC back
❌  withdraw — rejects overdraft
✅  RSI condition — fires when RSI < threshold

11 passing (285ms)
```

Run with:
```bash
anchor test
```

---

## Integration Points (for teammates)

### LI.FI (Cross-chain funding)
After LI.FI bridges USDC to Solana, the destination address should be the user's **escrow USDC token account**. Derive it as:

```typescript
const [escrowPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), ownerPublicKey.toBuffer()],
  new PublicKey("4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF")
);
// escrowUsdcAccount is the SPL token account owned by escrowPda
```

### Helius Webhooks (Condition monitoring)
Set up a webhook on price feed accounts. When a price update arrives, the keeper:
1. Computes whether the condition is met
2. Builds a `ConditionProof`
3. Calls `execute_trade` with Jupiter route in `remaining_accounts`

### ElevenLabs (Voice alerts)
Listen for program logs matching:
```
"Trade #N executed. Spent X USDC. Balance left: Y"
```
Parse and feed to ElevenLabs TTS for the voice notification.

### Jupiter CPI (Swap execution)
The crank pre-builds Jupiter swap instruction data using the [Jupiter Quote API](https://quote-api.jup.ag/v6/quote), then passes the route accounts as `remaining_accounts` to `execute_trade`.

---

## Deployment

| Network | Program ID |
|---------|-----------|
| Devnet | `4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF` |
| Mainnet | not yet deployed |

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Verify
solana program show 4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF --url devnet
```

---

## Built at

**[Hackathon Name]** · May 2026  
Anchor `0.30.1` · Solana `1.18` · Rust edition 2021