use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction.{OutputReference}
use aiken/transaction/credential.{Credential, VerificationKey}

pub type PubKeyHash =
  Hash<Blake2b_224, VerificationKey>

pub type CDP {
  owner: Credential,
  cdp_amount: Int,
  synthetic_amount: Int,
}

pub type Unlock {
  LiquidateCDP
  RepayCDP
}

pub type PolicyRedeemer {
  MintSynthetic {
    collateral_idx: Int,
    minting_amount: Int,
    collateral_amount: Int,
  }
  BurnSynthetic { oref: OutputReference, amount: Int, burn_name: ByteArray }
}

pub type Ratio_ {
  numerator: Int,
  denominator: Int,
}

pub type PriceFeed {
  price: Ratio_,
}
