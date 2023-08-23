use aiken/dict
use aiken/list
use aiken/math/rational
use aiken/transaction.{
  InlineDatum, Mint, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{ScriptCredential, VerificationKeyCredential}
use aiken/transaction/value
use butane/types
use butane/utils

type Params {
  liquidation_threshold_numerator: Int,
  initial_threshold_numerator: Int,
  threshold_denominator: Int,
}

validator(feed_script_hash: ByteArray, asset_name: ByteArray, params: Params) {
  fn unlock_collateral(
    datum: types.CDP,
    redeemer: types.Unlock,
    ctx: ScriptContext,
  ) -> Bool {
    let Params { liquidation_threshold_numerator, threshold_denominator, .. } =
      params
    expect types.CDP {
      owner: VerificationKeyCredential(owner_hash),
      cdp_amount,
      synthetic_amount,
    } = datum
    let ScriptContext {
      transaction: Transaction { inputs, redeemers, extra_signatories, .. },
      purpose,
    } = ctx
    expect Spend(own_oref) = purpose
    expect Some(own_input) =
      inputs |> list.find(fn(inp) { inp.output_reference == own_oref })
    expect ScriptCredential(own_pid) =
      own_input.output.address.payment_credential
    expect Some(mint_redeemer) = redeemers |> dict.get(Mint(own_pid))
    expect mint_redeemer: types.PolicyRedeemer = mint_redeemer
    let burn_condition =
      types.BurnSynthetic(own_oref, synthetic_amount, asset_name) == mint_redeemer
    let lvr_condition = {
      expect Some(synthetic_price) =
        utils.fetch_price(redeemers, feed_script_hash)
      expect Some(lvr) =
        utils.get_lvr(cdp_amount, synthetic_amount, synthetic_price)
      expect Some(liquidation_threshold) =
        rational.new(liquidation_threshold_numerator, threshold_denominator)
      rational.compare(lvr, liquidation_threshold) == Less
    }
    and {
      when redeemer is {
        types.RepayCDP -> extra_signatories |> list.has(owner_hash)
        types.LiquidateCDP -> lvr_condition?
      },
      burn_condition?,
    }
  }

  fn mint(redeemer: types.PolicyRedeemer, ctx: ScriptContext) -> Bool {
    let Params { initial_threshold_numerator, threshold_denominator, .. } =
      params
    let ScriptContext {
      transaction: Transaction { mint, outputs, redeemers, .. },
      purpose,
    } = ctx
    expect Mint(own_pid) = purpose
    when redeemer is {
      types.MintSynthetic { collateral_idx, minting_amount, collateral_amount } -> {
        let lvr_condition = {
          expect Some(synthetic_price) =
            utils.fetch_price(redeemers, feed_script_hash)
          expect Some(lvr) =
            utils.get_lvr(collateral_amount, minting_amount, synthetic_price)
          expect Some(minting_threshold) =
            rational.new(initial_threshold_numerator, threshold_denominator)
          when rational.compare(lvr, minting_threshold) is {
            Less -> False
            _ -> True
          }
        }
        // synthetic price in collateral
        expect [(_this_policy, mint_asset_name, asset_qty)] =
          mint |> value.from_minted_value |> value.flatten
        let mint_amount_condition = asset_qty == minting_amount
        let collateral_checks = {
          expect Some(Output {
            address: collateral_address,
            value,
            datum: InlineDatum(raw_datum),
            ..
          }) = list.at(outputs, collateral_idx)
          let collateral_output_address_check =
            collateral_address.payment_credential == ScriptCredential(own_pid)
          expect types.CDP { cdp_amount, synthetic_amount, .. }: types.CDP =
            raw_datum
          let datum_check = and {
              cdp_amount == collateral_amount,
              synthetic_amount == minting_amount,
            }
          let collateral_amount_check =
            ( value |> value.flatten ) == [("", "", collateral_amount)]
          and {
            datum_check?,
            collateral_output_address_check?,
            collateral_amount_check?,
          }
        }
        let asset_name_check = mint_asset_name == asset_name
        and {
          asset_name_check?,
          mint_amount_condition?,
          collateral_checks?,
          lvr_condition?,
        }
      }
      types.BurnSynthetic(_, synthetic_amount, asset_name) ->
        (
          mint
            |> value.from_minted_value
            |> value.flatten
        ) == [(own_pid, asset_name, -synthetic_amount)]
    }
  }
}
