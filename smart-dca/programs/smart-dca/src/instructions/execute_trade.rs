use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{EscrowAccount, ConditionType};
use crate::errors::SmartDcaError;

/// Off-chain keeper passes this as proof that the condition is met.
/// The program validates the data is recent via `timestamp`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ConditionProof {
    /// Current price in USD, scaled by 1e6 (e.g. $141.80 → 141_800_000)
    pub current_price: u64,

    /// 24-hour-ago price, same scale. Used for PriceDropPercent.
    pub price_24h_ago: u64,

    /// Current RSI (integer 0-100). Used for RsiBelow.
    pub rsi: u64,

    /// Last week's average price, same scale. Used for WeeklyIfBelow.
    pub last_week_price: u64,

    /// Current day of week (0 = Sun, 6 = Sat). Used for WeeklyIfBelow.
    pub day_of_week: u64,   // u64 to match threshold_bps comparison

    /// Unix timestamp when this proof was generated (must be within 60s of Clock).
    pub timestamp: i64,
}

// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    /// The trusted keeper/crank that calls this instruction.
    /// In production, restrict this to a specific pubkey via a constraint.
    #[account(mut)]
    pub crank: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_account.owner.as_ref()],
        bump = escrow_account.bump,
        has_one = usdc_token_account,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// Escrow's USDC token account (funds leave from here).
    #[account(mut)]
    pub usdc_token_account: Account<'info, TokenAccount>,

    /// ── Jupiter accounts (remaining_accounts) ──────────────────────────────
    /// Jupiter V6 requires a variable number of accounts passed as
    /// remaining_accounts. The actual swap is done via CPI using the
    /// route instruction. We include the program here for validation.
    /// CHECK: Jupiter program — verified by its known devnet address.
    #[account(address = jupiter_program_id())]
    pub jupiter_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// Jupiter V6 program ID (same on mainnet & devnet)
fn jupiter_program_id() -> Pubkey {
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
        .parse()
        .unwrap()
}

// ─────────────────────────────────────────────────────────────────────────────

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteTrade<'info>>,
    proof: ConditionProof,
) -> Result<()>{
    let clock = Clock::get()?;

    // 1. Proof freshness check (max 60 seconds old)
    require!(
        clock.unix_timestamp - proof.timestamp <= 60,
        SmartDcaError::StalePriceProof
    );

    let trade_amount;
    let execution_count;
    let balance;
    {
        let escrow = &mut ctx.accounts.escrow_account;

        // 2. Strategy must be active
        require!(escrow.is_active, SmartDcaError::StrategyInactive);

        // 3. Sufficient balance
        require!(
            escrow.balance >= escrow.condition.trade_amount_usdc,
            SmartDcaError::InsufficientBalance
        );

        // 4. Verify the condition is actually met
        verify_condition(escrow, &proof)?;

        // 5. Cooldown: at least 1 hour between trades (prevents spam)
        const COOLDOWN_SECONDS: i64 = 3600;
        if escrow.last_executed_at > 0 {
            require!(
                clock.unix_timestamp - escrow.last_executed_at >= COOLDOWN_SECONDS,
                SmartDcaError::CooldownNotElapsed
            );
        }

        // 6. Debit escrow balance before the swap.
        trade_amount = escrow.condition.trade_amount_usdc;
        escrow.balance = escrow
            .balance
            .checked_sub(trade_amount)
            .ok_or(SmartDcaError::Overflow)?;
        escrow.last_executed_at = clock.unix_timestamp;
        escrow.execution_count = escrow
            .execution_count
            .checked_add(1)
            .ok_or(SmartDcaError::Overflow)?;
        execution_count = escrow.execution_count;
        balance = escrow.balance;
    }

    // 7. CPI → Jupiter swap
    //    Jupiter V6 uses a single `route` instruction.
    //    The caller (crank) pre-builds the instruction data off-chain
    //    (using Jupiter's quote API) and passes remaining_accounts.
    //    We invoke it here with the escrow as the authority (PDA signer).
    invoke_jupiter_swap(&ctx, trade_amount)?;

    msg!(
        "Trade #{} executed. Spent {} USDC. Balance left: {}",
        execution_count,
        trade_amount,
        balance
    );

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
//  Condition verification
// ─────────────────────────────────────────────────────────────────────────────

fn verify_condition(escrow: &EscrowAccount, proof: &ConditionProof) -> Result<()> {
    let cond = &escrow.condition;

    match cond.condition_type {
        ConditionType::PriceDropPercent => {
            // drop_bps = (price_24h_ago - current_price) * 10_000 / price_24h_ago
            require!(proof.price_24h_ago > 0, SmartDcaError::ConditionNotMet);

            let drop = proof
                .price_24h_ago
                .saturating_sub(proof.current_price);
            let drop_bps = drop
                .checked_mul(10_000)
                .ok_or(SmartDcaError::Overflow)?
                .checked_div(proof.price_24h_ago)
                .ok_or(SmartDcaError::Overflow)?;

            require!(
                drop_bps >= cond.threshold_bps,
                SmartDcaError::ConditionNotMet
            );

            msg!(
                "PriceDropPercent met: drop_bps={}, required={}",
                drop_bps,
                cond.threshold_bps
            );
        }

        ConditionType::RsiBelow => {
            require!(
                proof.rsi < cond.threshold_bps,
                SmartDcaError::ConditionNotMet
            );
            msg!("RsiBelow met: rsi={}, threshold={}", proof.rsi, cond.threshold_bps);
        }

        ConditionType::WeeklyIfBelowLastWeek => {
            // Check correct day of week
            require!(
                proof.day_of_week as u64 == cond.threshold_bps,
                SmartDcaError::ConditionNotMet
            );
            // Check price is below last week
            require!(
                proof.current_price < proof.last_week_price,
                SmartDcaError::ConditionNotMet
            );
            msg!(
                "WeeklyIfBelowLastWeek met: day={}, curr_price={}, last_week={}",
                proof.day_of_week,
                proof.current_price,
                proof.last_week_price
            );
        }
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
//  Jupiter CPI
// ─────────────────────────────────────────────────────────────────────────────

fn invoke_jupiter_swap<'info>(
    ctx: &Context<'_, '_, '_, 'info, ExecuteTrade<'info>>,
    _amount: u64,
) -> Result<()> {
    // Jupiter V6 route instruction discriminator
    // The full instruction data (including route plan) is built off-chain
    // by the crank using Jupiter's quote API, then passed as remaining_accounts
    // account metas + instruction_data (future: pass via extra arg).
    //
    // For the hackathon demo we show the CPI structure.
    // The crank calls:
    //   1. GET https://quote-api.jup.ag/v6/quote?...
    //   2. GET https://quote-api.jup.ag/v6/swap-instructions
    //   3. Submits this instruction with the swap ix data injected.

    let escrow = &ctx.accounts.escrow_account;
    let owner_key = escrow.owner;
    let bump = escrow.bump;
    let seeds: &[&[u8]] = &[b"escrow", owner_key.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    // Build account metas from remaining_accounts
    // (Jupiter requires 10-20 accounts depending on route)
    let account_metas: Vec<anchor_lang::solana_program::instruction::AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| {
            if acc.is_writable {
                anchor_lang::solana_program::instruction::AccountMeta::new(
                    *acc.key, acc.is_signer,
                )
            } else {
                anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                    *acc.key, acc.is_signer,
                )
            }
        })
        .collect();

    // In a full implementation, `instruction_data` comes from Jupiter's API.
    // For the demo we emit a placeholder and return Ok.
    if account_metas.is_empty() {
        msg!("Jupiter CPI: no remaining_accounts provided (demo mode — no swap executed)");
        return Ok(());
    }

    // Real CPI call (used when crank provides full remaining_accounts):
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.jupiter_program.key(),
        accounts: account_metas,
        // Crank pre-builds this data via Jupiter SDK
        data: vec![], // TODO: inject via instruction parameter
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        ctx.remaining_accounts,
        signer_seeds,
    )?;

    Ok(())
}
