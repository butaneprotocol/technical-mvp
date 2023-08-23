import { Lucid } from "lucid";
import { PriceFeedCheckFeed, SyntheticsMint } from "butane";

export function stringToHex(str: string): string {
  let res = "";
  for (let i = 0; i < str.length; i++) {
    res += str.charCodeAt(i).toString(16);
  }
  return res;
}

export function buildValidators(
  lucid: Lucid,
  syntheticName: string,
  syntheticParams: {
    liquidationThresholdNumerator: bigint;
    initialThresholdNumerator: bigint;
    thresholdDenominator: bigint;
  },
) {
  const priceFeedScript = new PriceFeedCheckFeed();
  const priceFeedScriptHash = lucid.utils.validatorToScriptHash(
    priceFeedScript,
  );
  const priceFeedWithdrawAddress = lucid.utils.validatorToRewardAddress(
    priceFeedScript,
  );

  const syntheticsScript = new SyntheticsMint(
    priceFeedScriptHash,
    stringToHex(syntheticName),
    syntheticParams,
  );
  const syntheticsScriptHash = lucid.utils.validatorToScriptHash(
    syntheticsScript,
  );
  const collateralAddress = lucid.utils.validatorToAddress(syntheticsScript);

  return {
    priceFeedScript,
    priceFeedScriptHash,
    priceFeedWithdrawAddress,
    syntheticsScript,
    syntheticName,
    syntheticsScriptHash,
    collateralAddress,
    syntheticParams,
  };
}
