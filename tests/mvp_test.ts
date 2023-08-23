import {
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.194.0/testing/bdd.ts";
import { Emulator, Lucid } from "lucid";
import { liquidateSynthetic, makeSynthetic, repaySynthetic } from "~/mvp.ts";
import {
  generateAccount,
  GeneratedAccount,
  quickSubmitBuilder,
} from "./util.ts";
import { defaultProtocolParams } from "./constants.ts";
import { BuildDetails } from "~/types.ts";
import { buildValidators } from "~/util.ts";

describe("Synthetic Tests", () => {
  let ACCOUNT_0: GeneratedAccount;
  let emulator: Emulator;
  let lucid: Lucid;
  let buildDetails: BuildDetails;

  beforeEach(async () => {
    ACCOUNT_0 = await generateAccount({
      lovelace: 1000000000000000n,
    });

    emulator = new Emulator([ACCOUNT_0], defaultProtocolParams);
    lucid = await Lucid.new(emulator);
    buildDetails = buildValidators(lucid, "butane-usd", {
      liquidationThresholdNumerator: 110n,
      initialThresholdNumerator: 120n,
      thresholdDenominator: 100n,
    });
    const rAddr = buildDetails.priceFeedWithdrawAddress;
    emulator.chain[rAddr] = {
      registeredStake: true,
      delegation: { rewards: 0n, poolId: "" },
    };
    emulator.awaitBlock(10_000); // For validity ranges to be valid
    lucid.selectWalletFromSeed(ACCOUNT_0.seedPhrase);
    emulator.awaitBlock(1);
  });

  it("Valid Synthetic Mint", async () => {
    await makeSynthetic(
      lucid,
      lucid.newTx(),
      buildDetails,
      {
        collateralAmount: 10000000000n,
        syntheticPrice: { numerator: 1n, denominator: 1n },
      },
    ).then(quickSubmitBuilder(emulator));
  });

  describe("Synthetic Minted", () => {
    beforeEach(async () => {
      await makeSynthetic(
        lucid,
        lucid.newTx(),
        buildDetails,
        {
          collateralAmount: 10000000000n,
          syntheticPrice: { numerator: 1n, denominator: 1n },
        },
      ).then(quickSubmitBuilder(emulator));
    });

    it("Valid Repayment", async () => {
      const [repayOutput] = await lucid.utxosAt(
        lucid.utils.scriptHashToCredential(buildDetails.syntheticsScriptHash),
      );

      await repaySynthetic(
        lucid,
        lucid.newTx(),
        buildDetails,
        {
          position: {
            txHash: repayOutput.txHash,
            outputIndex: repayOutput.outputIndex,
          },
          syntheticPrice: { numerator: 1n, denominator: 1n },
        },
      ).then(quickSubmitBuilder(emulator));
    });

    it("Valid Liquidation", async () => {
      const [repayOutput] = await lucid.utxosAt(
        lucid.utils.scriptHashToCredential(buildDetails.syntheticsScriptHash),
      );

      await liquidateSynthetic(
        lucid,
        lucid.newTx(),
        buildDetails,
        {
          position: {
            txHash: repayOutput.txHash,
            outputIndex: repayOutput.outputIndex,
          },
          syntheticPrice: { numerator: 110n, denominator: 100n },
        },
      ).then(quickSubmitBuilder(emulator));
    });
  });
});
