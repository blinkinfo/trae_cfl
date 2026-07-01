export const contestPhases = ["phase0", "phase1", "phase2"] as const;
export type ContestPhase = (typeof contestPhases)[number];

export type PhaseBoundary = {
  id: ContestPhase;
  name: string;
  gate: string;
  summary: string;
  definitionOfDone: string;
  deferredConcerns: string[];
};

export const phaseBoundaries: PhaseBoundary[] = [
  {
    id: "phase0",
    name: "Points MVP",
    gate: "Current baseline",
    summary:
      "Ships the points-only contest loop with real price ingestion, no wallet requirement, and no contract dependency in live user flows.",
    definitionOfDone:
      "Users can browse contests, submit a valid roster under the salary cap, let contests lock and close, and view leaderboard outcomes derived from real prices using fake balances only.",
    deferredConcerns: ["wallet connection", "escrow", "testnet payouts", "mainnet deployment"],
  },
  {
    id: "phase1",
    name: "Farcaster plus Base Sepolia",
    gate: "Blocked until Phase 0 is complete",
    summary:
      "Introduces SIWF, the Farcaster mini app manifest, Base Sepolia escrow deployment, and verifiable testnet entry and payout flows.",
    definitionOfDone:
      "One full contest lifecycle runs on Base Sepolia with entry, snapshotting, settlement, and payout claim all verifiable on-chain.",
    deferredConcerns: ["mainnet launch", "audit sign-off", "production stakes scaling"],
  },
  {
    id: "phase2",
    name: "Mainnet hardening",
    gate: "Blocked until Phase 1 is complete",
    summary:
      "Adds monitoring, security evidence, operational controls, and compliance readiness before enabling any real-money contests.",
    definitionOfDone:
      "The platform passes the security checklist, human review gate, and monitored soft-launch requirements for Base mainnet.",
    deferredConcerns: ["none beyond controlled launch execution"],
  },
];

export const stackDecisions = [
  {
    label: "Application",
    value: "Next.js App Router with TypeScript",
    reason: "Keeps the mini app UI, server routes, and background-friendly shared code in one deployable runtime.",
  },
  {
    label: "Package manager",
    value: "npm",
    reason: "Matches the initialized baseline and avoids adding workspace complexity before multi-package needs appear.",
  },
  {
    label: "Database",
    value: "PostgreSQL via Prisma",
    reason: "Provides typed models, migration history, and operationally simple deployment for contest and scoring data.",
  },
  {
    label: "Validation",
    value: "Zod",
    reason: "Allows one source of truth for request parsing, job input validation, and UI-safe domain contracts.",
  },
  {
    label: "Testing",
    value: "Vitest",
    reason: "Covers business rules quickly in Node without forcing browser-only test infrastructure into the baseline.",
  },
  {
    label: "Contracts",
    value: "Hardhat planned for Phase 1",
    reason: "Preserves phase discipline by reserving the contracts workspace now while deferring escrow compilation and deployment until the testnet milestone.",
  },
];
