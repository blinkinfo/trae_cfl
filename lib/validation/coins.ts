import { z } from "zod";
import { coinTiers } from "@/lib/domain/game";

const booleanFromQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const coinListQuerySchema = z.object({
  active: booleanFromQuery,
  tier: z.enum(coinTiers).optional(),
});

export const coinSchema = z.object({
  symbol: z.string().trim().min(2).max(12),
  name: z.string().trim().min(2).max(64),
  tier: z.enum(coinTiers),
  currentSalary: z.number().int().positive(),
  marketCapUsd: z.number().positive(),
  oracleSource: z.enum(["chainlink", "pyth"]),
  oracleFeedAddress: z.string().trim().min(1),
  isActive: z.boolean().default(true),
});

export type CoinInput = z.infer<typeof coinSchema>;

export const refreshCoinPoolRequestSchema = z.object({
  dryRun: z.boolean().default(false),
  triggeredBy: z.string().trim().min(1).max(80).optional(),
});

export type RefreshCoinPoolRequest = z.infer<typeof refreshCoinPoolRequestSchema>;
