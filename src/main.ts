import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import { cors } from "npm:hono/cors";
import { prettyJSON } from "npm:hono/pretty-json";
import { zValidator } from "hono/zod-validator";

import { liquidateSynthetic, makeSynthetic, repaySynthetic } from "~/mvp.ts";
import { Lucid } from "lucid/mod.ts";
import { buildValidators } from "~/util.ts";
import { MakeSyntheticArgsSchema, RepaySyntheticArgsSchema } from "./types.ts";

const lucid = await Lucid.new();

const buildDetails = buildValidators(lucid, "butane-usd", {
  liquidationThresholdNumerator: 110n,
  initialThresholdNumerator: 120n,
  thresholdDenominator: 100n,
});

const app = new Hono();

app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());

app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

app.post(
  "/create",
  zValidator("json", MakeSyntheticArgsSchema),
  async (c) => {
    const data = c.req.valid("json");
    lucid.selectWalletFrom(data.wallet);

    const { txBuilder } = await makeSynthetic(
      lucid,
      lucid.newTx(),
      buildDetails,
      data,
    );

    return c.json({
      cbor: (await txBuilder.complete()).toString(),
    });
  },
);

app.post(
  "/repay",
  zValidator("json", RepaySyntheticArgsSchema),
  async (c) => {
    const data = c.req.valid("json");
    lucid.selectWalletFrom(data.wallet);

    const { txBuilder } = await repaySynthetic(
      lucid,
      lucid.newTx(),
      buildDetails,
      data,
    );

    return c.json({
      cbor: (await txBuilder.complete()).toString(),
    });
  },
);

app.post(
  "/liquidate",
  zValidator("json", RepaySyntheticArgsSchema),
  async (c) => {
    const data = c.req.valid("json");
    lucid.selectWalletFrom(data.wallet);

    const { txBuilder } = await liquidateSynthetic(
      lucid,
      lucid.newTx(),
      buildDetails,
      data,
    );

    return c.json({
      cbor: (await txBuilder.complete()).toString(),
    });
  },
);

Deno.serve({ port: 8000 }, app.fetch);
