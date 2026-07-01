# Tasks
- [x] Task 1: Establish implementation baseline and delivery boundaries
  - [x] Confirm the target stack, package manager, deployment target, and repo layout for a Next.js App Router application with Postgres and Solidity tooling
  - [x] Define the concrete phase boundaries for Phase 0, Phase 1, and Phase 2 so later tasks do not pull mainnet-only concerns forward
  - [x] Document required environment variables, secrets, and developer setup prerequisites

- [x] Task 2: Implement the application and data foundation
  - [x] Scaffold the frontend and backend application structure
  - [x] Add database migrations or schema definitions for users, coins, contests, rosters, snapshots, results, and transactions
  - [x] Add shared validation schemas, typed domain models, and error-handling primitives used across API, jobs, and UI

- [ ] Task 3: Build the coin pool and salary engine
  - [ ] Implement curated coin ingestion with eligibility filtering for market cap, volume, exchange coverage, and oracle availability
  - [ ] Implement log-scaled salary calculation with persisted salary refresh metadata
  - [ ] Add admin-safe refresh jobs and tests for salary calculation behavior and failure handling

- [ ] Task 4: Build contest management and roster submission flows
  - [ ] Implement admin contest creation and public contest listing APIs
  - [ ] Implement roster validation for format rules, salary cap, duplicate prevention, entry limits, and lock-time cutoff
  - [ ] Persist rosters and roster-coin selections in a verifiable structure that supports later scoring and on-chain commitment

- [ ] Task 5: Build the Phase 0 gameplay loop
  - [ ] Implement real-price snapshot jobs for lock and close windows using TWAP sampling and raw sample storage
  - [ ] Implement the off-chain scoring, ranking, tiebreaker, and results pipeline
  - [ ] Implement Phase 0 refund or manual-review handling for oracle gaps and underfilled contests

- [ ] Task 6: Build the mobile-first user experience
  - [ ] Implement contest list, contest detail, roster builder, my contests, leaderboard, and wallet or balance screens
  - [ ] Add live salary tracking, coin tier labeling, countdowns, status badges, and clear validation states
  - [ ] Ensure the app is usable on small mobile viewports and supports contest-state transitions end to end

- [ ] Task 7: Integrate Farcaster and authentication for Phase 1
  - [ ] Publish the Farcaster manifest and wire `sdk.actions.ready()` correctly
  - [ ] Implement Sign In with Farcaster and persist `fid` to wallet identity linkage
  - [ ] Ensure protected flows degrade safely when Farcaster context or wallet state is unavailable

- [ ] Task 8: Implement the escrow contract and on-chain flows
  - [ ] Build `ContestEscrow.sol` with access control, events, pull-based payouts, refunds, and lifecycle guards
  - [ ] Implement backend services that create contests, submit roster commitments, record snapshots, settle contests, and expose claimable payouts
  - [ ] Deploy and verify the Phase 1 contract on Base Sepolia and connect the frontend to testnet transaction flows

- [ ] Task 9: Harden operations, observability, and security controls
  - [ ] Add structured logging, monitoring hooks, and alerts for failed snapshots, failed settlements, and inconsistent contest state
  - [ ] Add API rate limiting, secret handling, reporter/admin key separation, and safe retry behavior for background jobs
  - [ ] Run contract static analysis and complete the required manual security review handoff items for mainnet readiness

- [ ] Task 10: Verify the platform end to end
  - [ ] Add smart contract unit and lifecycle integration tests for entry, lock, settlement, claim, refund, and reentrancy resistance
  - [ ] Add backend unit tests for salary calculation, TWAP sampling, scoring, ranking, and oracle failure behavior
  - [ ] Run an end-to-end contest lifecycle on Base Sepolia and confirm app, database, and contract state remain consistent

# Task Dependencies
- `Task 2` depends on `Task 1`
- `Task 3` depends on `Task 2`
- `Task 4` depends on `Task 2`
- `Task 5` depends on `Task 3` and `Task 4`
- `Task 6` depends on `Task 4` and can progress in parallel with `Task 5` once shared data contracts are stable
- `Task 7` depends on `Task 6`
- `Task 8` depends on `Task 4` and `Task 5`, and Phase 1 work must not begin until Phase 0 definition of done is satisfied
- `Task 9` depends on `Task 8`
- `Task 10` depends on `Task 5`, `Task 8`, and `Task 9`
