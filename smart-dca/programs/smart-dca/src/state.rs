use anchor_lang::prelude::*;

// ─────────────────────────────────────────────
//  Condition Types
// ─────────────────────────────────────────────

/// The kind of trigger that fires a DCA trade.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum ConditionType {
    /// Fire when price drops by `threshold_bps` basis points within 24 h.
    /// e.g. 500 = 5.00%
    PriceDropPercent,

    /// Fire when RSI falls below `threshold_bps` (treated as integer, e.g. 30).
    RsiBelow,

    /// Fire every week on `day_of_week` (0 = Sun … 6 = Sat)
    /// if current price < last-week price.
    WeeklyIfBelowLastWeek,
}

// ─────────────────────────────────────────────
//  StrategyCondition  (stored inside EscrowAccount)
// ─────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct StrategyCondition {
    /// Which condition logic to apply.
    pub condition_type: ConditionType,

    /// Generic threshold value.
    /// • PriceDropPercent  → basis points  (500 = 5%)
    /// • RsiBelow          → RSI integer   (30)
    /// • WeeklyIfBelow…    → day_of_week   (0-6)
    pub threshold_bps: u64,

    /// Amount of USDC (in lamports / smallest unit) to spend per trigger.
    pub trade_amount_usdc: u64,

    /// Mint address of the token to BUY (e.g. SOL, JUP, BONK wrapped mint).
    pub output_mint: Pubkey,

    /// Minimum acceptable output tokens (slippage guard).
    /// Set to 0 to skip the check (not recommended for production).
    pub min_output_amount: u64,
}

// ─────────────────────────────────────────────
//  EscrowAccount  (one per user strategy)
// ─────────────────────────────────────────────

#[account]
pub struct EscrowAccount {
    /// The wallet that owns this escrow.
    pub owner: Pubkey,

    /// The USDC token account that this escrow controls.
    /// Funded by deposit(), drained by execute_trade().
    pub usdc_token_account: Pubkey,

    /// Total USDC deposited (informational, not enforced on-chain).
    pub total_deposited: u64,

    /// USDC remaining available for trades.
    pub balance: u64,

    /// The DCA strategy condition.
    pub condition: StrategyCondition,

    /// Timestamp of the last successful trade execution.
    pub last_executed_at: i64,

    /// How many trades have fired so far.
    pub execution_count: u64,

    /// Is this strategy currently active?
    pub is_active: bool,

    /// PDA bump seed.
    pub bump: u8,
}

impl EscrowAccount {
    /// Space calculation:
    ///   discriminator  8
    ///   owner          32
    ///   usdc_token_acct 32
    ///   total_deposited 8
    ///   balance         8
    ///   condition:
    ///     condition_type  1+1  (enum variant byte + Option padding)
    ///     threshold_bps   8
    ///     trade_amount    8
    ///     output_mint     32
    ///     min_output      8
    ///   last_executed_at 8
    ///   execution_count  8
    ///   is_active        1
    ///   bump             1
    ///   padding          16  (future-proof)
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + (2 + 8 + 8 + 32 + 8) + 8 + 8 + 1 + 1 + 16;
}