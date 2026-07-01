# CryptoFantasy End-to-End Platform Spec

## Why
The repository contains the game rules and the technical build direction, but not an execution-ready product specification that turns both documents into one coherent build plan. This change defines a phased, production-oriented specification so implementation can proceed without leaving critical gameplay, contract, oracle, security, or operational requirements ambiguous.

## What Changes
- Define a single end-to-end product specification for the CryptoFantasy mini app, backend, database, cron workers, and smart contract system.
- Define the full contest lifecycle from contest creation through roster submission, TWAP snapshotting, scoring, settlement, payout, and refund handling.
- Define the eligible coin pool, salary recalculation logic, roster validation, scoring rules, tiebreakers, and edge-case handling from the game rules document.
- Define the phased rollout path: Phase 0 points-based MVP, Phase 1 Farcaster plus Base Sepolia testnet money flow, and Phase 2 mainnet launch hardening.
- Define required testing, observability, operational safeguards, and deployment constraints needed for a production-level implementation.
- **BREAKING** Real-money flows are explicitly disallowed before the security, audit, and compliance gates are satisfied.

## Impact
- Affected specs: contest management, roster validation, salary engine, oracle integration, scoring engine, settlement, payout claims, refunds, Farcaster auth, API security, monitoring, deployment gates
- Affected code: Next.js App Router frontend, API routes and background jobs, Postgres schema and migrations, Solidity contracts, oracle adapters, automated tests, environment configuration, deployment scripts

## ADDED Requirements
### Requirement: Phase-Gated Delivery
The system SHALL be implemented in three gated phases and SHALL not start a later phase until the prior phase definition of done has been satisfied.

#### Scenario: Phase 0 completion gate
- **WHEN** the platform has a working points-only contest flow with real price data and no wallet or contract dependency
- **THEN** Phase 0 is complete and Phase 1 work may begin

#### Scenario: Phase 1 completion gate
- **WHEN** the platform successfully runs entry, snapshot, settlement, and payout claim flows on Base Sepolia with Farcaster integration
- **THEN** Phase 1 is complete and Phase 2 hardening may begin

### Requirement: Contest Lifecycle Management
The system SHALL support creating, listing, locking, closing, settling, refunding, and claiming payouts for contests across quick, classic, and weekly formats.

#### Scenario: Valid contest progresses normally
- **WHEN** a contest reaches lock time with enough confirmed entries and valid oracle data is available
- **THEN** the platform records lock snapshots, later records close snapshots, computes final scores, ranks entries, and exposes claimable payouts

#### Scenario: Contest fails minimum participation
- **WHEN** a contest reaches lock time without meeting `min_entries_required`
- **THEN** the platform marks the contest refundable and returns entry funds or points according to the active phase

### Requirement: Roster Validation and Salary Cap Enforcement
The system SHALL enforce roster size, unique coin selection, contest format rules, captain selection rules when enabled, salary cap limits, lock-time cutoffs, and per-user entry limits.

#### Scenario: User submits a valid roster
- **WHEN** a user selects the correct number of unique eligible coins within the salary cap before lock time
- **THEN** the roster is accepted, persisted, and committed to the active contest flow

#### Scenario: User submits an invalid roster
- **WHEN** a roster exceeds the salary cap, duplicates a coin, misses a required slot, violates the entry limit, or arrives after lock time
- **THEN** the submission is rejected with a clear validation error and no state change occurs

### Requirement: Coin Pool and Salary Engine
The system SHALL maintain a curated active coin pool based on market-cap, exchange coverage, trading-volume, and oracle availability requirements, and SHALL recalculate salaries on a scheduled cadence using a log-scaled market-cap model with volatility-aware tuning.

#### Scenario: Coin lacks a reliable oracle feed
- **WHEN** the system cannot verify a reliable Chainlink or Pyth feed for a coin
- **THEN** that coin is excluded from the eligible pool and is not offered in roster building

#### Scenario: Daily salary refresh runs
- **WHEN** the salary refresh job executes
- **THEN** it updates current salary values, records the update timestamp, and preserves enough data to explain the result during review or dispute handling

### Requirement: TWAP Price Snapshotting
The system SHALL compute lock and close prices from sampled oracle data gathered over a defined time window and SHALL preserve both TWAP outputs and raw samples for auditability.

#### Scenario: Successful snapshot window
- **WHEN** the lock or close job samples all required coin feeds during the configured time window
- **THEN** the system stores the raw samples, calculates a TWAP for each coin, and records the finalized snapshot set

#### Scenario: Oracle gap during snapshot window
- **WHEN** one or more required coin feeds fail during the window
- **THEN** the system blocks automatic settlement, flags the contest for review, and follows the refund or manual-review path defined for the active phase

### Requirement: Scoring, Ranking, and Tiebreakers
The system SHALL score each roster from percentage price changes derived from lock and close TWAPs, sum slot scores, apply captain multipliers only when enabled, support negative scores, and break ties using a published ordered tiebreaker policy.

#### Scenario: Standard scoring
- **WHEN** a contest closes with valid snapshots
- **THEN** each roster receives a reproducible score equal to the sum of its constituent coin percentage moves, with captain adjustments applied if configured

#### Scenario: Final-score tie
- **WHEN** two or more rosters finish with the same final score
- **THEN** the platform resolves the ranking using the published tiebreaker sequence and stores the basis for the decision

### Requirement: Smart Contract Escrow and Settlement
The system SHALL use an escrow contract for paid contests in Phase 1 and beyond, with role-based access control, pull-based payouts, refund support, emitted events for every state-changing action, and explicit guards against reentrancy and invalid lifecycle transitions.

#### Scenario: Successful paid contest
- **WHEN** a paid contest is created, entered before lock, settled after close, and claimed by a winner
- **THEN** the contract preserves escrow integrity, records contest state transitions, and allows each eligible winner to claim exactly once

#### Scenario: Unauthorized or invalid contract action
- **WHEN** an unauthorized actor or an invalid lifecycle call attempts to create, settle, refund, withdraw, or claim
- **THEN** the transaction reverts and the contract state remains unchanged

### Requirement: Farcaster Mini App Experience
The system SHALL ship a mobile-first Farcaster mini app with a manifest, first-render readiness signaling, SIWF authentication, and all required user screens for browsing contests, building rosters, tracking entries, viewing leaderboards, and claiming payouts.

#### Scenario: First launch in Farcaster
- **WHEN** a user opens the mini app for the first time
- **THEN** the app completes SIWF, links the user's `fid` with their wallet address, and dismisses the splash screen only after meaningful content is rendered

#### Scenario: User tracks active contests
- **WHEN** a logged-in user opens their contest history
- **THEN** the app shows pending, live, settled, refundable, and claimable roster states with accurate status transitions

### Requirement: Security, Reliability, and Production Readiness
The system SHALL include automated testing for money-sensitive logic, explicit error handling for all external dependencies, API rate limiting, operational monitoring, separate admin and reporter credentials, and a pre-mainnet human review gate.

#### Scenario: Deployment to mainnet candidate
- **WHEN** the team prepares for Phase 2 deployment
- **THEN** all required security checklist items, static analysis, review evidence, and operational controls must be complete before real-money contests are enabled

#### Scenario: External dependency failure
- **WHEN** a price feed, database dependency, RPC endpoint, or wallet interaction fails
- **THEN** the system surfaces a defined failure state, preserves data integrity, and avoids silent partial completion
