import { describe, expect, it } from "vitest";
import { getRosterRules } from "@/lib/domain/game";
import { phaseBoundaries } from "@/lib/domain/platform";

describe("phase boundaries", () => {
  it("keeps the release gates in the approved order", () => {
    expect(phaseBoundaries.map((phase) => phase.id)).toEqual(["phase0", "phase1", "phase2"]);
  });
});

describe("roster rules", () => {
  it("uses a smaller roster size for quick contests", () => {
    expect(getRosterRules("quick")).toMatchObject({ slots: 3, captainEnabled: false });
  });

  it("keeps captain mode enabled for classic contests", () => {
    expect(getRosterRules("classic")).toMatchObject({ slots: 5, captainEnabled: true });
  });
});
