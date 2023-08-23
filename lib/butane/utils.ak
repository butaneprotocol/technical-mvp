use aiken/dict.{Dict}
use aiken/math/rational.{Rational}
use aiken/transaction.{Redeemer, ScriptPurpose, WithdrawFrom}
use aiken/transaction/credential.{Inline, ScriptCredential}
use butane/types

pub fn fetch_price(
  redeemers: Dict<ScriptPurpose, Redeemer>,
  feed_script_hash: ByteArray,
) -> Option<Rational> {
  expect Some(raw_redeemer) =
    redeemers
      |> dict.get(WithdrawFrom(Inline(ScriptCredential(feed_script_hash))))
  expect types.PriceFeed(types.Ratio_ { numerator, denominator }): types.PriceFeed =
    raw_redeemer
  rational.new(numerator, denominator)
}

pub fn get_lvr(
  collateral_amount: Int,
  synthetic_amount: Int,
  synthetic_price: Rational,
) -> Option<Rational> {
  collateral_amount
    |> rational.from_int
    |> rational.div(
         rational.mul(synthetic_price, synthetic_amount |> rational.from_int),
       )
}
