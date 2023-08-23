import { z } from "zod";
import { buildValidators } from "~/util.ts";
import { ExternalWallet, UTxO } from "lucid";

export const RatioSchema = z.object({
  numerator: z.coerce.bigint(),
  denominator: z.coerce.bigint(),
});

export const OutRefSchema = z.object({
  txHash: z.string(),
  outputIndex: z.number(),
});

export const UTxOSchema: z.ZodType<UTxO> = z.object({
  txHash: z.string(),
  outputIndex: z.number(),
  assets: z.record(z.string(), z.bigint()),
  address: z.string(),
  datumHash: z.string().optional(),
  datum: z.string().optional(),
  scriptRef: z.object({
    type: z.union([
      z.literal("PlutusV1"),
      z.literal("PlutusV2"),
      z.literal("Native"),
    ]),
    script: z.string(),
  }).optional(),
});

export const ExternalWalletSchema: z.ZodType<ExternalWallet> = z.object({
  address: z.string(),
  rewardAddress: z.string().optional(),
  utxos: z.array(UTxOSchema).optional(),
});

export const BaseSchema = z.object({
  wallet: ExternalWalletSchema,
});

export const RepaySyntheticFuncArgsSchema = z.object({
  position: OutRefSchema,
  syntheticPrice: RatioSchema,
});

export const MakeSyntheticFuncArgsSchema = z.object({
  collateralAmount: z.coerce.bigint(),
  syntheticPrice: RatioSchema,
});

export const RepaySyntheticArgsSchema = BaseSchema.merge(
  RepaySyntheticFuncArgsSchema,
);
export const MakeSyntheticArgsSchema = BaseSchema.merge(
  MakeSyntheticFuncArgsSchema,
);

export type BuildDetails = Awaited<ReturnType<typeof buildValidators>>;

export type Ratio = z.infer<typeof RatioSchema>;

export type MakeSyntheticArgs = z.infer<typeof MakeSyntheticFuncArgsSchema>;

export type OutRef = z.infer<typeof OutRefSchema>;

export type RepaySyntheticArgs = z.infer<typeof RepaySyntheticFuncArgsSchema>;
