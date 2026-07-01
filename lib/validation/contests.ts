import { z } from "zod";
import { contestFormats } from "@/lib/domain/game";
import { contestPhases } from "@/lib/domain/platform";

export const contestListQuerySchema = z.object({
  status: z.enum(["draft", "open", "locked", "closed", "settled", "refunded", "cancelled"]).optional(),
  phase: z.enum(contestPhases).optional(),
});

export const createContestSchema = z
  .object({
    slug: z.string().trim().min(3).max(80),
    title: z.string().trim().min(3).max(120),
    phase: z.enum(contestPhases),
    format: z.enum(contestFormats),
    salaryCap: z.number().int().positive(),
    entryFeeWei: z.bigint().nonnegative(),
    rakeBps: z.number().int().min(0).max(1500),
    maxEntriesPerUser: z.number().int().min(1).max(5),
    minEntriesRequired: z.number().int().min(2),
    lockTime: z.coerce.date(),
    closeTime: z.coerce.date(),
  })
  .refine((value) => value.closeTime > value.lockTime, {
    message: "closeTime must be later than lockTime",
    path: ["closeTime"],
  });

export type CreateContestInput = z.infer<typeof createContestSchema>;
