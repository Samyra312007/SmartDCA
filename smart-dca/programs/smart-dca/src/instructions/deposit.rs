use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::EscrowAccount;
use crate::errors::SmartDcaError;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", owner.key().as_ref()],
        bump = escrow_account.bump,
        has_one = owner @ SmartDcaError::Unauthorized,
        has_one = usdc_token_account,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub usdc_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_usdc_account.owner == owner.key(),
    )]
    pub owner_usdc_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, SmartDcaError::InsufficientBalance);

    let cpi_accounts = Transfer {
        from: ctx.accounts.owner_usdc_account.to_account_info(),
        to: ctx.accounts.usdc_token_account.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    token::transfer(cpi_ctx, amount)?;
    let escrow = &mut ctx.accounts.escrow_account;
    escrow.balance = escrow
        .balance
        .checked_add(amount)
        .ok_or(SmartDcaError::Overflow)?;
    escrow.total_deposited = escrow
        .total_deposited
        .checked_add(amount)
        .ok_or(SmartDcaError::Overflow)?;

    msg!("Deposited {} USDC. New balance: {}", amount, escrow.balance);

    Ok(())
}