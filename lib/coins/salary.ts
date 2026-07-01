import type { CoinTier } from "@/lib/domain/game";

export const coinPoolEligibilityConfig = {
  maxMarketCapRank: 100,
  minDailyVolumeUsd: 10_000_000,
  minMajorExchangeCoverage: 2,
  majorTierMarketCapUsd: 100_000_000_000,
  midTierMarketCapUsd: 10_000_000_000,
  minSalary: 1_500,
  maxSalary: 20_000,
  salaryRoundingStep: 100,
  volatilityPenaltyCapPct: 40,
  maxVolatilityPenalty: 2_500,
} as const;

export type SalaryCalculationInput = {
  marketCapUsd: number;
  minMarketCapUsd: number;
  maxMarketCapUsd: number;
  absolutePriceChange24hPct?: number | null;
};

export type SalaryCalculationResult = {
  normalizedMarketCap: number;
  baseSalary: number;
  volatilityPenalty: number;
  finalSalary: number;
};

export function determineCoinTier(marketCapUsd: number): CoinTier {
  if (marketCapUsd >= coinPoolEligibilityConfig.majorTierMarketCapUsd) {
    return "major";
  }

  if (marketCapUsd >= coinPoolEligibilityConfig.midTierMarketCapUsd) {
    return "mid";
  }

  return "small";
}

export function calculateLogScaledSalary(
  input: SalaryCalculationInput,
): SalaryCalculationResult {
  const {
    marketCapUsd,
    minMarketCapUsd,
    maxMarketCapUsd,
    absolutePriceChange24hPct,
  } = input;

  const boundedMin = Math.max(minMarketCapUsd, 1);
  const boundedMax = Math.max(maxMarketCapUsd, boundedMin);
  const boundedCap = clamp(marketCapUsd, boundedMin, boundedMax);

  const logMin = Math.log10(boundedMin);
  const logMax = Math.log10(boundedMax);
  const logCap = Math.log10(boundedCap);

  const normalizedMarketCap =
    logMax === logMin ? 1 : clamp((logCap - logMin) / (logMax - logMin), 0, 1);

  const salaryRange =
    coinPoolEligibilityConfig.maxSalary - coinPoolEligibilityConfig.minSalary;
  const baseSalary =
    coinPoolEligibilityConfig.minSalary + normalizedMarketCap * salaryRange;

  const volatilityRatio = clamp(
    Math.abs(absolutePriceChange24hPct ?? 0) /
      coinPoolEligibilityConfig.volatilityPenaltyCapPct,
    0,
    1,
  );
  const volatilityPenalty =
    volatilityRatio * coinPoolEligibilityConfig.maxVolatilityPenalty;

  const finalSalary = roundToStep(
    clamp(
      baseSalary - volatilityPenalty,
      coinPoolEligibilityConfig.minSalary,
      coinPoolEligibilityConfig.maxSalary,
    ),
    coinPoolEligibilityConfig.salaryRoundingStep,
  );

  return {
    normalizedMarketCap,
    baseSalary: roundToStep(baseSalary, coinPoolEligibilityConfig.salaryRoundingStep),
    volatilityPenalty: roundToStep(
      volatilityPenalty,
      coinPoolEligibilityConfig.salaryRoundingStep,
    ),
    finalSalary,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}
