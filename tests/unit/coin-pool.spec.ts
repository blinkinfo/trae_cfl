import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { buildCuratedCoinPool, executeCoinPoolRefresh } from "@/lib/coins/refresh";
import { calculateLogScaledSalary } from "@/lib/coins/salary";

describe("calculateLogScaledSalary", () => {
  it("keeps larger caps more expensive while discounting volatility", () => {
    const major = calculateLogScaledSalary({
      marketCapUsd: 900_000_000_000,
      minMarketCapUsd: 5_000_000_000,
      maxMarketCapUsd: 900_000_000_000,
      absolutePriceChange24hPct: 2,
    });

    const volatileMajor = calculateLogScaledSalary({
      marketCapUsd: 900_000_000_000,
      minMarketCapUsd: 5_000_000_000,
      maxMarketCapUsd: 900_000_000_000,
      absolutePriceChange24hPct: 35,
    });

    const smallCap = calculateLogScaledSalary({
      marketCapUsd: 5_000_000_000,
      minMarketCapUsd: 5_000_000_000,
      maxMarketCapUsd: 900_000_000_000,
      absolutePriceChange24hPct: 12,
    });

    expect(major).toMatchObject({
      baseSalary: 20_000,
      volatilityPenalty: 100,
      finalSalary: 19_900,
    });
    expect(volatileMajor.finalSalary).toBe(17_800);
    expect(smallCap.finalSalary).toBe(1_500);
    expect(major.finalSalary).toBeGreaterThan(smallCap.finalSalary);
  });
});

describe("buildCuratedCoinPool", () => {
  it("filters on market cap rank, volume, exchange coverage, asset type, and oracle availability", () => {
    const refreshedAt = new Date("2026-07-02T12:00:00.000Z");
    const result = buildCuratedCoinPool({
      source: "test-provider",
      refreshedAt,
      oracleCatalog: {
        chainlink: {
          BTC: "0xbtc",
        },
        pyth: {},
      },
      candidates: [
        {
          externalId: "bitcoin",
          symbol: "BTC",
          name: "Bitcoin",
          marketCapRank: 1,
          marketCapUsd: 1_000_000_000_000,
          volume24hUsd: 50_000_000_000,
          priceChange24hPct: 4,
          exchangeIds: ["binance", "coinbase_exchange", "kraken"],
        },
        {
          externalId: "dogecoin",
          symbol: "DOGE",
          name: "Dogecoin",
          marketCapRank: 9,
          marketCapUsd: 20_000_000_000,
          volume24hUsd: 9_000_000,
          priceChange24hPct: 15,
          exchangeIds: ["binance", "coinbase_exchange"],
        },
        {
          externalId: "usdc",
          symbol: "USDC",
          name: "USD Coin",
          marketCapRank: 6,
          marketCapUsd: 30_000_000_000,
          volume24hUsd: 9_000_000_000,
          priceChange24hPct: 0.1,
          exchangeIds: ["binance", "coinbase_exchange", "kraken"],
        },
        {
          externalId: "memecoin",
          symbol: "MEME",
          name: "Memecoin",
          marketCapRank: 75,
          marketCapUsd: 2_500_000_000,
          volume24hUsd: 30_000_000,
          priceChange24hPct: 25,
          exchangeIds: ["binance"],
        },
      ],
    });

    expect(result.eligibleCount).toBe(1);
    expect(result.eligibleCoins.map((coin) => coin.symbol)).toEqual(["BTC"]);

    const reasonsBySymbol = Object.fromEntries(
      result.evaluations.map((coin) => [coin.symbol, coin.exclusionReasons]),
    );

    expect(reasonsBySymbol.DOGE).toContain("daily_volume");
    expect(reasonsBySymbol.USDC).toContain("asset_type");
    expect(reasonsBySymbol.MEME).toContain("exchange_coverage");
    expect(reasonsBySymbol.MEME).toContain("oracle_availability");
  });
});

describe("executeCoinPoolRefresh", () => {
  it("records a failed run and does not persist partial writes when the provider errors", async () => {
    const repository = {
      startRun: vi.fn(async () => ({ id: "run-1" })),
      completeDryRun: vi.fn(async () => undefined),
      persistSuccessfulRun: vi.fn(async () => undefined),
      failRun: vi.fn(async () => undefined),
    };

    const provider = {
      source: "test-provider",
      fetchCandidates: vi.fn(async () => {
        throw new AppError({
          code: "COIN_MARKET_DATA_UNAVAILABLE",
          message: "upstream unavailable",
          statusCode: 502,
        });
      }),
    };

    await expect(
      executeCoinPoolRefresh({
        provider,
        repository,
        oracleCatalog: { chainlink: {}, pyth: {} },
        triggeredBy: "unit-test",
      }),
    ).rejects.toThrow("upstream unavailable");

    expect(repository.startRun).toHaveBeenCalledTimes(1);
    expect(repository.persistSuccessfulRun).not.toHaveBeenCalled();
    expect(repository.completeDryRun).not.toHaveBeenCalled();
    expect(repository.failRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        code: "COIN_MARKET_DATA_UNAVAILABLE",
        message: "upstream unavailable",
      }),
    );
  });
});
