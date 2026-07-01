import { z } from "zod";
import { getEnv } from "@/lib/env";

const oracleFeedMapSchema = z.record(z.string(), z.string().trim().min(1));

export type OracleCatalog = {
  chainlink: Record<string, string>;
  pyth: Record<string, string>;
};

function parseOracleFeedMap(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  const normalized = oracleFeedMapSchema.parse(parsed);

  return Object.fromEntries(
    Object.entries(normalized).map(([symbol, feedAddress]) => [
      symbol.trim().toUpperCase(),
      feedAddress,
    ]),
  );
}

export function getOracleCatalog(): OracleCatalog {
  const env = getEnv();

  return {
    chainlink: parseOracleFeedMap(env.CHAINLINK_FEED_ADDRESSES),
    pyth: parseOracleFeedMap(env.PYTH_ENDPOINT_AND_FEED_IDS),
  };
}

export function resolveOracleForSymbol(
  symbol: string,
  oracleCatalog: OracleCatalog,
) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (oracleCatalog.chainlink[normalizedSymbol]) {
    return {
      source: "chainlink" as const,
      feedAddress: oracleCatalog.chainlink[normalizedSymbol],
    };
  }

  if (oracleCatalog.pyth[normalizedSymbol]) {
    return {
      source: "pyth" as const,
      feedAddress: oracleCatalog.pyth[normalizedSymbol],
    };
  }

  return null;
}
