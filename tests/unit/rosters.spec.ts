import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { validateRosterSelection } from "@/lib/validation/rosters";

const contestId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
const coinIds = [
  "00000000-0000-4000-8000-000000000101",
  "00000000-0000-4000-8000-000000000102",
  "00000000-0000-4000-8000-000000000103",
  "00000000-0000-4000-8000-000000000104",
  "00000000-0000-4000-8000-000000000105",
];

function buildInput() {
  return {
    contestFormat: "classic" as const,
    contestId,
    userId,
    selectedCoinIds: coinIds,
    captainCoinId: coinIds[0],
    salaryCap: 50000,
    salaryUsed: 48000,
    maxEntriesPerUser: 3,
    existingEntriesForUser: 1,
    lockTime: new Date("2026-07-03T00:00:00.000Z"),
    submittedAt: new Date("2026-07-02T23:55:00.000Z"),
  };
}

describe("validateRosterSelection", () => {
  it("accepts a valid classic roster", () => {
    expect(validateRosterSelection(buildInput()).ok).toBe(true);
  });

  it("rejects duplicate selections", () => {
    expect(() =>
      validateRosterSelection({
        ...buildInput(),
        selectedCoinIds: [coinIds[0], coinIds[0], coinIds[2], coinIds[3], coinIds[4]],
      }),
    ).toThrow(AppError);
  });

  it("rejects salary cap breaches", () => {
    expect(() =>
      validateRosterSelection({
        ...buildInput(),
        salaryUsed: 51000,
      }),
    ).toThrowError(/exceeds the active contest cap/i);
  });

  it("rejects a captain that is not in the roster", () => {
    expect(() =>
      validateRosterSelection({
        ...buildInput(),
        captainCoinId: "00000000-0000-4000-8000-000000000999",
      }),
    ).toThrowError(/must be part of the roster/i);
  });
});
