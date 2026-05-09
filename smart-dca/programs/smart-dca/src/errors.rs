use anchor_lang::prelude::*;

#[error_code]
pub enum SmartDcaError {
    #[msg("Insufficient escrow balance for this trade")]
    InsufficientBalance,

    #[msg("Strategy is not active")]
    StrategyInactive,

    #[msg("Condition has not been met")]
    ConditionNotMet,

    #[msg("Unauthorized: only the escrow owner can call this")]
    Unauthorized,

    #[msg("Withdrawal amount exceeds available balance")]
    WithdrawTooLarge,

    #[msg("Cooldown period has not elapsed since last trade")]
    CooldownNotElapsed,

    #[msg("Price proof is stale (older than 60 seconds)")]
    StalePriceProof,

    #[msg("Arithmetic overflow")]
    Overflow,
}