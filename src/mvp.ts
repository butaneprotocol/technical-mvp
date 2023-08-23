import { Data, Lucid, toUnit, Tx } from "lucid";
import {
  PriceFeedCheckFeed,
  SyntheticsMint,
  SyntheticsUnlockCollateral,
} from "butane";
import {
  BuildDetails,
  MakeSyntheticArgs,
  RepaySyntheticArgs,
} from "~/types.ts";
import { stringToHex } from "~/util.ts";

export async function makeSynthetic(
  lucid: Lucid,
  tx: Tx,
  buildDetails: BuildDetails,
  {
    collateralAmount,
    syntheticPrice,
  }: MakeSyntheticArgs,
) {
  // we calculate maximum synthetic we can mint with given collateral
  // e.g we go backwards from the initial_threshold value to calculate
  // the maximum amount of collateral we can use to mint synthetic
  const syntheticAmount: bigint =
    (buildDetails.syntheticParams.thresholdDenominator * collateralAmount) /
    buildDetails.syntheticParams.initialThresholdNumerator;

  const redeemer: SyntheticsMint["redeemer"] = {
    MintSynthetic: {
      collateralIdx: 0n,
      mintingAmount: syntheticAmount,
      collateralAmount,
    },
  };
  const priceFeedRedeemer: PriceFeedCheckFeed["_redeemer"] = {
    price: { ...syntheticPrice },
  };
  const own_credential =
    lucid.utils.paymentCredentialOf(await lucid.wallet.address()).hash;

  const datum: SyntheticsUnlockCollateral["datum"] = {
    owner: {
      VerificationKeyCredential: [own_credential],
    },
    cdpAmount: collateralAmount,
    syntheticAmount,
  };
  const syntheticUnit = toUnit(
    buildDetails.syntheticsScriptHash,
    stringToHex(buildDetails.syntheticName),
  );
  const txBuilder = tx
    .attachMintingPolicy(buildDetails.syntheticsScript)
    .attachWithdrawalValidator(buildDetails.priceFeedScript)
    .payToContract(
      buildDetails.collateralAddress,
      { inline: Data.to(datum, SyntheticsUnlockCollateral["datum"]) },
      {
        lovelace: collateralAmount,
      },
    )
    .mintAssets({
      [
        syntheticUnit
      ]: syntheticAmount,
    }, Data.to(redeemer, SyntheticsMint["redeemer"]))
    .withdraw(
      buildDetails.priceFeedWithdrawAddress,
      0n,
      Data.to(priceFeedRedeemer, PriceFeedCheckFeed["_redeemer"]),
    )
    .addSigner(await lucid.wallet.address());
  return { txBuilder };
}

export async function repaySynthetic(
  lucid: Lucid,
  tx: Tx,
  buildDetails: BuildDetails,
  {
    position,
    syntheticPrice,
  }: RepaySyntheticArgs,
) {
  const [output] = await lucid.utxosByOutRef([position]);
  const positionDatum = Data.from(
    output.datum!,
    SyntheticsUnlockCollateral["datum"],
  );

  const redeemer: SyntheticsMint["redeemer"] = {
    BurnSynthetic: {
      oref: {
        transactionId: {
          hash: output.txHash,
        },
        outputIndex: BigInt(output.outputIndex),
      },
      amount: positionDatum.syntheticAmount,
      burnName: stringToHex(buildDetails.syntheticName),
    },
  };

  const spendRedeemer: SyntheticsUnlockCollateral["redeemer"] = {
    wrapper: "RepayCDP",
  };

  const priceFeedRedeemer: PriceFeedCheckFeed["_redeemer"] = {
    price: { ...syntheticPrice },
  };

  const syntheticUnit = toUnit(
    buildDetails.syntheticsScriptHash,
    stringToHex(buildDetails.syntheticName),
  );

  const txBuilder = tx
    .attachMintingPolicy(buildDetails.syntheticsScript)
    .attachWithdrawalValidator(buildDetails.priceFeedScript)
    .collectFrom(
      [output],
      Data.to(spendRedeemer, SyntheticsUnlockCollateral["redeemer"]),
    )
    .mintAssets({
      [
        syntheticUnit
      ]: -positionDatum.syntheticAmount,
    }, Data.to(redeemer, SyntheticsMint["redeemer"]))
    .withdraw(
      buildDetails.priceFeedWithdrawAddress,
      0n,
      Data.to(priceFeedRedeemer, PriceFeedCheckFeed["_redeemer"]),
    )
    .addSigner(await lucid.wallet.address());
  return { txBuilder };
}

export async function liquidateSynthetic(
  lucid: Lucid,
  tx: Tx,
  buildDetails: BuildDetails,
  {
    position,
    syntheticPrice,
  }: RepaySyntheticArgs,
) {
  const [output] = await lucid.utxosByOutRef([position]);
  const positionDatum = Data.from(
    output.datum!,
    SyntheticsUnlockCollateral["datum"],
  );

  const redeemer: SyntheticsMint["redeemer"] = {
    BurnSynthetic: {
      oref: {
        transactionId: {
          hash: output.txHash,
        },
        outputIndex: BigInt(output.outputIndex),
      },
      amount: positionDatum.syntheticAmount,
      burnName: stringToHex(buildDetails.syntheticName),
    },
  };

  const spendRedeemer: SyntheticsUnlockCollateral["redeemer"] = {
    wrapper: "LiquidateCDP",
  };

  const priceFeedRedeemer: PriceFeedCheckFeed["_redeemer"] = {
    price: { ...syntheticPrice },
  };

  const syntheticUnit = toUnit(
    buildDetails.syntheticsScriptHash,
    stringToHex(buildDetails.syntheticName),
  );

  const txBuilder = tx
    .attachMintingPolicy(buildDetails.syntheticsScript)
    .attachWithdrawalValidator(buildDetails.priceFeedScript)
    .collectFrom(
      [output],
      Data.to(spendRedeemer, SyntheticsUnlockCollateral["redeemer"]),
    )
    .mintAssets({
      [
        syntheticUnit
      ]: -positionDatum.syntheticAmount,
    }, Data.to(redeemer, SyntheticsMint["redeemer"]))
    .withdraw(
      buildDetails.priceFeedWithdrawAddress,
      0n,
      Data.to(priceFeedRedeemer, PriceFeedCheckFeed["_redeemer"]),
    )
    .addSigner(await lucid.wallet.address());
  return { txBuilder };
}
