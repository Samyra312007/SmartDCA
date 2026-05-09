use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{EscrowAccount, StrategyCondition};

/// One user can have multiple strategies by bumping strategy_index.
#[derive(Accounts)]
#[instruction(condition: StrategyCondition)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = EscrowAccount::LEN,
        seeds = [
            b"escrow",
            owner.key().as_ref(),
        ],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        constraint = usdc_token_account.owner == escrow_account.key(),
    )]
    pub usdc_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>, condition: StrategyCondition) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow_account;
    let bump = ctx.bumps.escrow_account;

    escrow.owner = ctx.accounts.owner.key();
    escrow.usdc_token_account = ctx.accounts.usdc_token_account.key();
    escrow.total_deposited = 0;
    escrow.balance = 0;
    escrow.condition = condition;
    escrow.last_executed_at = 0;
    escrow.execution_count = 0;
    escrow.is_active = true;
    escrow.bump = bump;

    msg!(
        "SmartDCA escrow initialized for owner: {}",
        ctx.accounts.owner.key()
    );

    Ok(())
}
