use anchor_lang::prelude::*;
use crate::state::EscrowAccount;
use crate::errors::SmartDcaError;

#[derive(Accounts)]
pub struct SetActive<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", owner.key().as_ref()],
        bump = escrow_account.bump,
        has_one = owner @ SmartDcaError::Unauthorized,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
}

pub fn handler(ctx: Context<SetActive>, is_active: bool) -> Result<()> {
    ctx.accounts.escrow_account.is_active = is_active;
    msg!(
        "Strategy is now: {}",
        if is_active { "ACTIVE" } else { "PAUSED" }
    );
    Ok(())
}