use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::EscrowAccount;
use crate::errors::SmartDcaError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
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

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow_account;

    require!(
        amount <= escrow.balance,
        SmartDcaError::WithdrawTooLarge
    );

    let owner_key = escrow.owner;
    let bump = escrow.bump;
    let seeds: &[&[u8]] = &[b"escrow", owner_key.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.usdc_token_account.to_account_info(),
        to: ctx.accounts.owner_usdc_account.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    escrow.balance = escrow
        .balance
        .checked_sub(amount)
        .ok_or(SmartDcaError::Overflow)?;

    msg!("Withdrew {} USDC. Remaining balance: {}", amount, escrow.balance);

    Ok(())
}