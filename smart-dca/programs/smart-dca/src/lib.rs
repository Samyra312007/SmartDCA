use anchor_lang::prelude::*;
 
pub mod errors;
pub mod instructions;
pub mod state;

use crate::instructions::{
    initialize::Initialize,
    deposit::Deposit,
    withdraw::Withdraw,
    execute_trade::{ExecuteTrade, ConditionProof},
    set_active::SetActive,
};

use crate::state::StrategyCondition;


declare_id!("4uH1ZvU29XFzRCEk4S7dNT29gUWMPU3gHaZQdhiacxhF");

#[program]
pub mod smart_dca {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>,
                      condition: StrategyCondition, 
        ) -> Result<()> {
            instructions::initialize::handler(ctx, condition)
    }

    pub fn deposit(ctx:Context<Deposit>, amount:u64) -> Result<()>{
        instructions::deposit::handler(ctx,amount)
    }

    pub fn withdraw(ctx:Context<Withdraw>, amount:u64) ->Result<()>{
        instructions::withdraw::handler(ctx,amount)
    }

     pub fn execute_trade<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteTrade<'info>>,
    condition_met_proof: ConditionProof,
) -> Result<()> {
    instructions::execute_trade::handler(ctx, condition_met_proof)
}

    pub fn set_active(ctx: Context<SetActive>, is_active: bool) -> Result<()> {
        instructions::set_active::handler(ctx, is_active)
    }
}
