use aiken/transaction.{ScriptContext}
use butane/types

validator {
  fn check_feed(_redeemer: types.PriceFeed, _ctx: ScriptContext) -> Bool {
    True
  }
}
