import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import type { CoinMarketDataProvider, MarketCoinCandidate } from "@/lib/coins/coingecko";
import type { OracleCatalog } from "@/lib/coins/oracles";
import {
  calculateLogScaledSalary,
  coinPoolEligibilityConfig,
  determineCoinTier,
} from "@/lib/coins/salary";

const excludedSymbolSet = new Set([
  "USDT",
  "USDC",
  "DAI",
  "FDUSD",
  "TUSD",
  "USDE",
  "USDS",
  "USDP",
  "USDD",
  "PYUSD",
  "WBTC",
  "WETH",
  "STETH",
  "WSTETH",
  "CBETH",
  "RETH",
]);

const excludedNameKeywords = [
  "stablecoin",
  "wrapped",
  "bridged",
  "synthetic",
  "liquid staking",
  "restaked",
  "staked ether",
  "wrapped bitcoin",
  "wrapped ether",
  "bridged usdc",
  "bridged tether",
];

export type CoinEligibilityEvaluation = {
  symbol: string;
  name: string;
  externalId: string;
  marketCapRank: number | null;
  marketCapUsd: number;
  volume24hUsd: number;
  exchangeIds: string[];
  oracleSource: "chainlink" | "pyth" | null;
  oracleFeedAddress: string | null;
  eligible: boolean;
  tier: ReturnType<typeof determineCoinTier>;
  exclusionReasons: string[];
  metadata: Record<string, unknown>;
};

export type EligibleCoinRecord = {
  symbol: string;
  name: string;
  tier: ReturnType<typeof determineCoinTier>;
  currentSalary: number;
  marketCapUsd: number;
  oracleSource: "chainlink" | "pyth";
  oracleFeedAddress: string;
  metadata: Record<string, unknown>;
};

export type CoinPoolRefreshResult = {
  source: string;
  refreshedAt: Date;
  candidateCount: number;
  eligibleCount: number;
  ineligibleCount: number;
  eligibleCoins: EligibleCoinRecord[];
  evaluations: CoinEligibilityEvaluation[];
  summaryMetadata: Record<string, unknown>;
};

type RefreshRunHandle = {
  id: string;
};

export interface CoinPoolRefreshRepository {
  startRun(input: {
    source: string;
    dryRun: boolean;
    triggeredBy: string;
    startedAt: Date;
  }): Promise<RefreshRunHandle>;
  completeDryRun(runId: string, result: CoinPoolRefreshResult): Promise<void>;
  persistSuccessfulRun(runId: string, result: CoinPoolRefreshResult): Promise<void>;
  failRun(
    runId: string,
    error: { code: string; message: string; details?: unknown; completedAt: Date },
  ): Promise<void>;
}

export async function executeCoinPoolRefresh(input: {
  provider: CoinMarketDataProvider;
  repository: CoinPoolRefreshRepository;
  oracleCatalog: OracleCatalog;
  triggeredBy: string;
  dryRun?: boolean;
  refreshedAt?: Date;
}) {
  const refreshedAt = input.refreshedAt ?? new Date();
  const run = await input.repository.startRun({
    source: input.provider.source,
    dryRun: input.dryRun ?? false,
    triggeredBy: input.triggeredBy,
    startedAt: refreshedAt,
  });

  try {
    const candidates = await input.provider.fetchCandidates();
    const result = buildCuratedCoinPool({
      source: input.provider.source,
      candidates,
      oracleCatalog: input.oracleCatalog,
      refreshedAt,
    });

    if (input.dryRun) {
      await input.repository.completeDryRun(run.id, result);
    } else {
      await input.repository.persistSuccessfulRun(run.id, result);
    }

    return {
      runId: run.id,
      source: result.source,
      dryRun: input.dryRun ?? false,
      refreshedAt: result.refreshedAt.toISOString(),
      candidateCount: result.candidateCount,
      eligibleCount: result.eligibleCount,
      ineligibleCount: result.ineligibleCount,
      eligibleSymbols: result.eligibleCoins.map((coin) => coin.symbol),
      ineligibleSamples: result.evaluations
        .filter((coin) => !coin.eligible)
        .slice(0, 10)
        .map((coin) => ({
          symbol: coin.symbol,
          reasons: coin.exclusionReasons,
        })),
    };
  } catch (error) {
    await input.repository.failRun(run.id, {
      code: error instanceof AppError ? error.code : "COIN_POOL_REFRESH_FAILED",
      message:
        error instanceof Error ? error.message : "Coin pool refresh failed unexpectedly.",
      details: error instanceof AppError ? error.details : undefined,
      completedAt: new Date(),
    });

    throw error;
  }
}

export function buildCuratedCoinPool(input: {
  source: string;
  candidates: MarketCoinCandidate[];
  oracleCatalog: OracleCatalog;
  refreshedAt: Date;
}): CoinPoolRefreshResult {
  if (input.candidates.length === 0) {
    throw new AppError({
      code: "COIN_POOL_EMPTY",
      message: "The market data provider returned no coin candidates for ingestion.",
      statusCode: 502,
    });
  }

  const evaluations = input.candidates.map((candidate) =>
    evaluateCoinEligibility(candidate, input.oracleCatalog, input.refreshedAt),
  );
  const eligibleEvaluations = evaluations.filter((evaluation) => evaluation.eligible);

  if (eligibleEvaluations.length === 0) {
    throw new AppError({
      code: "NO_ELIGIBLE_COINS",
      message: "No eligible coins remained after market, liquidity, exchange, and oracle checks.",
      statusCode: 502,
      details: summarizeEvaluations(evaluations),
    });
  }

  const marketCaps = eligibleEvaluations.map((coin) => coin.marketCapUsd);
  const minMarketCapUsd = Math.min(...marketCaps);
  const maxMarketCapUsd = Math.max(...marketCaps);

  const eligibleCoins = eligibleEvaluations.map((coin) => {
    const salary = calculateLogScaledSalary({
      marketCapUsd: coin.marketCapUsd,
      minMarketCapUsd,
      maxMarketCapUsd,
      absolutePriceChange24hPct:
        typeof coin.metadata.priceChange24hPct === "number"
          ? coin.metadata.priceChange24hPct
          : null,
    });

    return {
      symbol: coin.symbol,
      name: coin.name,
      tier: coin.tier,
      currentSalary: salary.finalSalary,
      marketCapUsd: coin.marketCapUsd,
      oracleSource: coin.oracleSource!,
      oracleFeedAddress: coin.oracleFeedAddress!,
      metadata: {
        ...coin.metadata,
        salary: {
          model: "log_market_cap_with_volatility_penalty",
          normalizedMarketCap: salary.normalizedMarketCap,
          baseSalary: salary.baseSalary,
          volatilityPenalty: salary.volatilityPenalty,
          finalSalary: salary.finalSalary,
        },
      },
    };
  });

  return {
    source: input.source,
    refreshedAt: input.refreshedAt,
    candidateCount: input.candidates.length,
    eligibleCount: eligibleCoins.length,
    ineligibleCount: input.candidates.length - eligibleCoins.length,
    eligibleCoins,
    evaluations,
    summaryMetadata: summarizeEvaluations(evaluations),
  };
}

export function createPrismaCoinPoolRefreshRepository(
  prismaClient: PrismaClient = db,
): CoinPoolRefreshRepository {
  return {
    async startRun(input) {
      const run = await prismaClient.salaryRefreshRun.create({
        data: {
          source: input.source,
          status: "running",
          dryRun: input.dryRun,
          triggeredBy: input.triggeredBy,
          startedAt: input.startedAt,
        },
        select: { id: true },
      });

      return run;
    },
    async completeDryRun(runId, result) {
      await prismaClient.salaryRefreshRun.update({
        where: { id: runId },
        data: {
          status: "dry_run",
          candidateCount: result.candidateCount,
          eligibleCount: result.eligibleCount,
          ineligibleCount: result.ineligibleCount,
          completedAt: result.refreshedAt,
          metadata: toJsonValue(result.summaryMetadata),
        },
      });
    },
    async persistSuccessfulRun(runId, result) {
      await prismaClient.$transaction(async (tx) => {
        for (const coin of result.eligibleCoins) {
          await tx.coin.upsert({
            where: { symbol: coin.symbol },
            create: {
              symbol: coin.symbol,
              name: coin.name,
              tier: coin.tier,
              currentSalary: coin.currentSalary,
              marketCapUsd: coin.marketCapUsd,
              oracleSource: coin.oracleSource,
              oracleFeedAddress: coin.oracleFeedAddress,
              isActive: true,
              lastSalaryUpdateAt: result.refreshedAt,
              metadata: toJsonValue({
                ...coin.metadata,
                refresh: {
                  source: result.source,
                  runId,
                  refreshedAt: result.refreshedAt.toISOString(),
                },
              }),
            },
            update: {
              name: coin.name,
              tier: coin.tier,
              currentSalary: coin.currentSalary,
              marketCapUsd: coin.marketCapUsd,
              oracleSource: coin.oracleSource,
              oracleFeedAddress: coin.oracleFeedAddress,
              isActive: true,
              lastSalaryUpdateAt: result.refreshedAt,
              metadata: toJsonValue({
                ...coin.metadata,
                refresh: {
                  source: result.source,
                  runId,
                  refreshedAt: result.refreshedAt.toISOString(),
                },
              }),
            },
          });
        }

        for (const evaluation of result.evaluations.filter((coin) => !coin.eligible)) {
          await tx.coin.updateMany({
            where: { symbol: evaluation.symbol },
            data: {
              name: evaluation.name,
              tier: evaluation.tier,
              marketCapUsd: evaluation.marketCapUsd,
              isActive: false,
              lastSalaryUpdateAt: result.refreshedAt,
              metadata: toJsonValue({
                ...evaluation.metadata,
                refresh: {
                  source: result.source,
                  runId,
                  refreshedAt: result.refreshedAt.toISOString(),
                },
              }),
            },
          });
        }

        await tx.coin.updateMany({
          where: {
            isActive: true,
            symbol: { notIn: result.evaluations.map((coin) => coin.symbol) },
          },
          data: {
            isActive: false,
            lastSalaryUpdateAt: result.refreshedAt,
            metadata: toJsonValue({
              refresh: {
                source: result.source,
                runId,
                refreshedAt: result.refreshedAt.toISOString(),
                deactivatedReason: "missing_from_latest_curated_ingestion",
              },
            }),
          },
        });

        await tx.salaryRefreshRun.update({
          where: { id: runId },
          data: {
            status: "succeeded",
            candidateCount: result.candidateCount,
            eligibleCount: result.eligibleCount,
            ineligibleCount: result.ineligibleCount,
            completedAt: result.refreshedAt,
            metadata: toJsonValue(result.summaryMetadata),
          },
        });
      });
    },
    async failRun(runId, error) {
      await prismaClient.salaryRefreshRun.update({
        where: { id: runId },
        data: {
          status: "failed",
          completedAt: error.completedAt,
          errorCode: error.code,
          errorMessage: error.message,
          metadata: toJsonValue(
            error.details && typeof error.details === "object"
              ? { failure: error.details }
              : {},
          ),
        },
      });
    },
  };
}

function evaluateCoinEligibility(
  candidate: MarketCoinCandidate,
  oracleCatalog: OracleCatalog,
  refreshedAt: Date,
): CoinEligibilityEvaluation {
  const oracle = resolveOracle(candidate.symbol, oracleCatalog);
  const exclusionReasons: string[] = [];
  const normalizedName = candidate.name.toLowerCase();
  const normalizedExternalId = candidate.externalId.toLowerCase();
  const stableOrWrappedAsset =
    excludedSymbolSet.has(candidate.symbol) ||
    excludedNameKeywords.some(
      (keyword) =>
        normalizedName.includes(keyword) || normalizedExternalId.includes(keyword.replaceAll(" ", "-")),
    );

  if (
    candidate.marketCapRank === null ||
    candidate.marketCapRank > coinPoolEligibilityConfig.maxMarketCapRank
  ) {
    exclusionReasons.push("market_cap_rank");
  }

  if (candidate.volume24hUsd < coinPoolEligibilityConfig.minDailyVolumeUsd) {
    exclusionReasons.push("daily_volume");
  }

  if (
    candidate.exchangeIds.length < coinPoolEligibilityConfig.minMajorExchangeCoverage
  ) {
    exclusionReasons.push("exchange_coverage");
  }

  if (!oracle) {
    exclusionReasons.push("oracle_availability");
  }

  if (stableOrWrappedAsset) {
    exclusionReasons.push("asset_type");
  }

  const eligible = exclusionReasons.length === 0;

  return {
    symbol: candidate.symbol,
    name: candidate.name,
    externalId: candidate.externalId,
    marketCapRank: candidate.marketCapRank,
    marketCapUsd: candidate.marketCapUsd,
    volume24hUsd: candidate.volume24hUsd,
    exchangeIds: candidate.exchangeIds,
    oracleSource: oracle?.source ?? null,
    oracleFeedAddress: oracle?.feedAddress ?? null,
    eligible,
    tier: determineCoinTier(candidate.marketCapUsd),
    exclusionReasons,
    metadata: {
      source: {
        provider: "coingecko",
        externalId: candidate.externalId,
        exchangeIds: candidate.exchangeIds,
      },
      priceChange24hPct: candidate.priceChange24hPct,
      eligibility: {
        eligible,
        checks: {
          marketCapRank: candidate.marketCapRank,
          maxMarketCapRank: coinPoolEligibilityConfig.maxMarketCapRank,
          volume24hUsd: candidate.volume24hUsd,
          minDailyVolumeUsd: coinPoolEligibilityConfig.minDailyVolumeUsd,
          exchangeCoverage: candidate.exchangeIds.length,
          minMajorExchangeCoverage: coinPoolEligibilityConfig.minMajorExchangeCoverage,
          oracleAvailable: Boolean(oracle),
          assetTypeEligible: !stableOrWrappedAsset,
        },
        exclusionReasons,
      },
      refresh: {
        refreshedAt: refreshedAt.toISOString(),
      },
    },
  };
}

function resolveOracle(symbol: string, oracleCatalog: OracleCatalog) {
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

function summarizeEvaluations(evaluations: CoinEligibilityEvaluation[]) {
  const exclusionCounts = evaluations.reduce<Record<string, number>>((accumulator, coin) => {
    for (const reason of coin.exclusionReasons) {
      accumulator[reason] = (accumulator[reason] ?? 0) + 1;
    }

    return accumulator;
  }, {});

  return {
    exclusionCounts,
    eligibleSymbols: evaluations.filter((coin) => coin.eligible).map((coin) => coin.symbol),
    totalCandidates: evaluations.length,
  };
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
