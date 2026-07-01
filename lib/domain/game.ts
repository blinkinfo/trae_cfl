export const contestFormats = ["quick", "classic", "weekly"] as const;
export type ContestFormat = (typeof contestFormats)[number];

export const coinTiers = ["major", "mid", "small"] as const;
export type CoinTier = (typeof coinTiers)[number];

export const tiebreakerPolicy = [
  "salary_used_desc",
  "best_coin_score_desc",
  "submitted_at_asc",
] as const;

export type RosterRules = {
  slots: number;
  captainEnabled: boolean;
  salaryCapDefault: number;
  snapshotWindowMinutes: number;
};

export function getRosterRules(format: ContestFormat): RosterRules {
  switch (format) {
    case "quick":
      return {
        slots: 3,
        captainEnabled: false,
        salaryCapDefault: 30000,
        snapshotWindowMinutes: 3,
      };
    case "classic":
      return {
        slots: 5,
        captainEnabled: true,
        salaryCapDefault: 50000,
        snapshotWindowMinutes: 5,
      };
    case "weekly":
      return {
        slots: 5,
        captainEnabled: true,
        salaryCapDefault: 50000,
        snapshotWindowMinutes: 5,
      };
  }
}
