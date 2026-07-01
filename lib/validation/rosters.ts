import { z } from "zod";
import { AppError } from "@/lib/errors";
import { getRosterRules } from "@/lib/domain/game";

export const rosterSelectionSchema = z.object({
  contestFormat: z.enum(["quick", "classic", "weekly"]),
  contestId: z.string().uuid(),
  userId: z.string().uuid(),
  selectedCoinIds: z.array(z.string().uuid()),
  captainCoinId: z.string().uuid().optional(),
  salaryCap: z.number().int().positive(),
  salaryUsed: z.number().int().nonnegative(),
  maxEntriesPerUser: z.number().int().positive(),
  existingEntriesForUser: z.number().int().nonnegative(),
  lockTime: z.coerce.date(),
  submittedAt: z.coerce.date(),
});

export type RosterSelectionInput = z.infer<typeof rosterSelectionSchema>;

export function validateRosterSelection(input: RosterSelectionInput) {
  const parsed = rosterSelectionSchema.parse(input);
  const rules = getRosterRules(parsed.contestFormat);
  const uniqueCoins = new Set(parsed.selectedCoinIds);

  if (parsed.submittedAt >= parsed.lockTime) {
    throw new AppError({
      code: "ROSTER_LOCKED",
      message: "Rosters cannot be submitted after contest lock time.",
      statusCode: 409,
    });
  }

  if (parsed.existingEntriesForUser >= parsed.maxEntriesPerUser) {
    throw new AppError({
      code: "ENTRY_LIMIT_REACHED",
      message: "The user has reached the maximum number of entries for this contest.",
      statusCode: 409,
    });
  }

  if (parsed.selectedCoinIds.length !== rules.slots) {
    throw new AppError({
      code: "INVALID_ROSTER_SIZE",
      message: `Expected ${rules.slots} roster slots for ${parsed.contestFormat}.`,
      statusCode: 400,
    });
  }

  if (uniqueCoins.size !== parsed.selectedCoinIds.length) {
    throw new AppError({
      code: "DUPLICATE_COIN_SELECTION",
      message: "Roster submissions cannot include duplicate coin selections.",
      statusCode: 400,
    });
  }

  if (parsed.salaryUsed > parsed.salaryCap) {
    throw new AppError({
      code: "SALARY_CAP_EXCEEDED",
      message: "Roster salary usage exceeds the active contest cap.",
      statusCode: 400,
    });
  }

  if (rules.captainEnabled && !parsed.captainCoinId) {
    throw new AppError({
      code: "CAPTAIN_REQUIRED",
      message: "This contest format requires a captain selection.",
      statusCode: 400,
    });
  }

  if (parsed.captainCoinId && !uniqueCoins.has(parsed.captainCoinId)) {
    throw new AppError({
      code: "CAPTAIN_NOT_IN_ROSTER",
      message: "The selected captain must be part of the roster.",
      statusCode: 400,
    });
  }

  return {
    ok: true,
    parsed,
    rules,
  };
}
