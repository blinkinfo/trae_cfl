import { z } from "zod";
import { contestPhases } from "@/lib/domain/platform";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("CryptoFantasy"),
  NEXT_PUBLIC_PHASE: z.enum(contestPhases).default("phase0"),
});

const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().trim().min(1),
  FARCASTER_MANIFEST_SIGNATURE: z.string().optional(),
  BASE_SEPOLIA_RPC_URL: z.string().optional(),
  BASE_MAINNET_RPC_URL: z.string().optional(),
  REPORTER_PRIVATE_KEY: z.string().optional(),
  ADMIN_PRIVATE_KEY_OR_MULTISIG_ADDRESS: z.string().optional(),
  ADMIN_JOB_SECRET: z.string().trim().min(1).optional(),
  CHAINLINK_FEED_ADDRESSES: z.string().default("{}"),
  PYTH_ENDPOINT_AND_FEED_IDS: z.string().default("{}"),
});

export function getEnv() {
  return serverEnvSchema.parse(process.env);
}

export function getPublicEnv() {
  return publicEnvSchema.safeParse(process.env).success
    ? publicEnvSchema.parse(process.env)
    : {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_NAME: "CryptoFantasy",
        NEXT_PUBLIC_PHASE: "phase0" as const,
      };
}
