# CryptoFantasy — Technical Build Specification (for Replit AI Agent)

**Companion file:** `crypto-fantasy-game-rules.md` defines WHAT the game is (rules, scoring, salary cap). This file defines HOW to build it. Read both before writing code.

**Build order is mandatory:** Phase 0 → Phase 1 → Phase 2, in that order. Do not begin Phase 1 work until Phase 0's Definition of Done is fully met. Do not begin Phase 2 until Phase 1 is fully met. Building out of order is how "half-implemented" products happen — this spec exists specifically to prevent that.

---

## 0. Engineering Standards (apply to every phase)

- No mock data, placeholder logic, or "TODO: implement later" left in any code path that ships. If a feature isn't ready, it's not included in that phase — not stubbed.
- Every external call (price API, database, wallet, contract) must have explicit error handling and a defined fallback/failure state — never a silent failure.
- Every money-related function (entry, payout, refund) must have an automated test before being considered done.
- Secrets (RPC URLs, private keys, API keys) live only in Replit Secrets / environment variables — never hardcoded, never committed.
- Every state-changing smart contract function emits an event.
- Git commit after each completed task in the phase task lists below, so progress is checkpointed and reviewable.

---

## 1. Architecture

- **Frontend:** Next.js (App Router), deployed as the Farcaster mini app itself
- **Farcaster integration:** `@farcaster/miniapp-sdk`, Sign In with Farcaster (SIWF) for auth
- **Backend:** Next.js API routes (or a separate Node service if the agent judges it cleaner) for contest management, scoring, coin pool data
- **Database:** Postgres (Replit's built-in Postgres, or Neon/Supabase if preferred) for users, contests, rosters, results
- **Smart contracts:** Solidity, deployed to **Base Sepolia** (Phase 1) then **Base mainnet** (Phase 2)
- **Price oracle:** Primary source Chainlink Price Feeds on Base for majors (BTC, ETH, and other coins with existing feeds). For coins without a Chainlink feed on Base, use **Pyth Network** (broader altcoin/meme-coin coverage, low latency) as the source. Agent must verify live feed availability for every coin before finalizing the eligible coin pool — do not assume a feed exists without checking; drop any coin from the pool that lacks a reliable feed rather than falling back to an unverified price source.
- **Contract libraries:** OpenZeppelin (Ownable/AccessControl, ReentrancyGuard, SafeERC20 if using a token for entry fees)

---

## 2. Database Schema

```
users
  id, fid (Farcaster ID, unique), wallet_address, created_at

coins
  id, symbol, name, tier (major/mid/small), current_salary,
  market_cap, oracle_feed_address, oracle_source (chainlink/pyth),
  is_active, last_salary_update_at

contests
  id, format (quick/classic/weekly), entry_fee, salary_cap,
  lock_time, close_time, status (open/locked/settled/refunded),
  prize_pool, rake_bps, max_entries_per_user, min_entries_required,
  contract_address, contract_contest_id

rosters
  id, user_id, contest_id, captain_coin_id, salary_used,
  submitted_at, tx_hash, status (pending/confirmed/failed)

roster_coins
  roster_id, coin_id, slot_number

price_snapshots
  contest_id, coin_id, snapshot_type (lock/close),
  twap_price, sample_count, window_start, window_end, recorded_at

results
  contest_id, roster_id, raw_score, final_score (with captain multiplier),
  rank, payout_amount, payout_status, payout_tx_hash

transactions
  id, user_id, contest_id, type (entry/payout/refund),
  amount, tx_hash, status, created_at
```

---

## 3. Smart Contract Specification

**Contract name:** `ContestEscrow.sol`

**Core functions:**
- `createContest(entryFee, salaryCap, lockTime, closeTime, maxEntriesPerUser, minEntriesRequired)` — admin only
- `enterContest(contestId, rosterCommitHash)` — payable; roster details stored off-chain in Postgres, only a hash committed on-chain so the roster can later be verified as unmodified
- `recordSnapshot(contestId, snapshotType, coinPrices[])` — called by a trusted backend reporter role at lock and close, storing oracle-derived TWAP prices on-chain
- `settleContest(contestId, rosterHashes[], scores[], ranks[])` — posts final computed results on-chain; scores must be reproducible by anyone re-deriving them from the on-chain-stored snapshot prices (this is what keeps an off-chain scoring engine trust-minimized — it's checkable, not blindly trusted)
- `claimPayout(contestId, rosterId)` — pull-based payout (user claims, contract never pushes funds) to avoid forced-send reentrancy issues
- `refundContest(contestId)` — triggered if `minEntriesRequired` isn't met by lock time, or if oracle/snapshot data fails validation; returns entry fees to all entrants
- `withdrawRake(contestId)` — admin only, after settlement

**Required safeguards:**
- `ReentrancyGuard` on `enterContest`, `claimPayout`, `refundContest`
- `AccessControl` with distinct roles: `ADMIN_ROLE` (create/withdraw), `REPORTER_ROLE` (snapshot/settle — ideally a separate backend signer key, not the admin key)
- Pull-payment pattern only — never loop-send funds to a list of winners in one transaction (gas limit + reentrancy risk)
- All amounts in wei, all percentages in basis points (no floating point in Solidity)
- Explicit checks: reject entries after lock time, reject duplicate entries beyond `maxEntriesPerUser`, reject settlement before close time

**Design decision (documented, not left ambiguous):** Scoring happens off-chain (in the backend scoring engine) using on-chain-anchored prices, then results are posted back on-chain. This avoids the gas cost of computing percentage math for every roster on-chain, while remaining verifiable since anyone can recompute the same result from the publicly stored snapshot prices and roster hashes.

---

## 4. Oracle & TWAP Implementation

- At `lock_time` and `close_time`, the backend samples each active coin's price every ~15–30 seconds for a 3–5 minute window, averages them into a TWAP, and submits the result via `recordSnapshot`.
- If a coin's oracle (Chainlink or Pyth) fails to return data for the full window, that contest must be flagged for manual review before settlement — do not settle with a partial or estimated price.
- Store the raw sample data (not just the final TWAP) in `price_snapshots` for auditability/dispute resolution.

---

## 5. Backend Services

- `POST /api/contests` — create contest (admin)
- `GET /api/contests` — list contests by status
- `GET /api/coins` — eligible coin pool with current salaries
- `POST /api/roster` — validate salary cap, slot count, lock-time cutoff, then submit
- Cron: `refreshCoinSalaries` (daily) — recalculates salaries per the log-scaled market-cap formula in the game rules doc
- Cron: `lockContests` (runs continuously, triggers at each contest's `lock_time`) — takes lock TWAP snapshot, calls `recordSnapshot`
- Cron: `closeAndSettleContests` — takes close TWAP snapshot, computes scores/ranks, calls `settleContest`
- Cron: `checkMinEntries` — at lock time, triggers `refundContest` if `min_entries_required` not met

---

## 6. Frontend / Mini App Requirements

- Manifest at `/.well-known/farcaster.json` with app name, icon, description, and verified ownership signature
- Call `sdk.actions.ready()` once the app has loaded and rendered its first meaningful content, to dismiss the splash screen
- SIWF login on first launch, storing `fid` against the user's wallet address
- **Screens required (all — none optional for "done"):**
  - Contest list (filter by format/entry fee)
  - Contest detail (rules recap, entry fee, prize structure, countdown to lock)
  - Roster builder (live salary cap tracker, coin tiers visibly labeled, captain selector)
  - My Rosters / My Contests (pending, live, settled)
  - Leaderboard (live during contest, final after settlement)
  - Payout claim screen (shows claimable amount, triggers `claimPayout` tx)
  - Wallet/balance view
- Mobile-first layout — mini apps render inside the Farcaster feed, primarily on mobile screens

---

## 7. Testing Requirements

**Smart contracts (Hardhat or Foundry):**
- Unit tests for every function listed in Section 3, including failure paths (entry after lock, double-claim, unauthorized settlement call, refund eligibility)
- Reentrancy attack simulation test against `claimPayout`
- Full lifecycle integration test: create → enter (multiple users) → lock → settle → claim, on a local test chain

**Backend:**
- Salary calculation formula unit tests against known market-cap inputs
- TWAP calculation unit tests, including a simulated oracle gap/failure

**End-to-end (manual checklist minimum, automate if feasible):**
- Full contest lifecycle run on Base Sepolia with test wallets, confirming on-chain state matches database state at every step

---

## 8. Security Checklist — Required Before Any Mainnet Deployment

- [ ] All Section 3 safeguards implemented and tested
- [ ] No private keys or secrets in code or version control
- [ ] Static analysis run (e.g., Slither) with all high/medium findings resolved or explicitly justified
- [ ] Admin and reporter keys are separate, and admin key is ideally a multisig, not a single EOA
- [ ] Contract has been reviewed by a human — either a paid third-party audit or, at minimum, a careful manual review by someone other than the agent that wrote it. **A production-grade real-money contract should not go to mainnet on AI-generated code alone without independent human review — this is a hard requirement, not a suggestion.**
- [ ] Rate limiting in place on public API routes
- [ ] Jurisdiction/compliance question from the game rules doc has been addressed before real entry fees go live

---

## 9. Phased Task List

### Phase 0 — Points-Based MVP (no wallet, no contract)
- [ ] Next.js app scaffolded, deployed on Replit with a public URL
- [ ] Database schema implemented (contests/rosters/coins tables at minimum; transactions/payouts can wait)
- [ ] Coin pool populated and salary formula implemented per game rules doc
- [ ] Roster builder UI with live salary cap enforcement
- [ ] Contest lock/close cron jobs using real live price data (not contract-based yet — just read prices, compute scores, store results)
- [ ] Leaderboard and results screens functional end-to-end using fake point balances
- **Definition of Done:** A user can browse a contest, build a valid roster under the cap, have it lock automatically, see real price-based scoring after close, and see a leaderboard — entirely with fake currency.

### Phase 1 — Farcaster Integration + Testnet Money
- [ ] Farcaster manifest published and validated via Farcaster's embed/dev tools
- [ ] `sdk.actions.ready()` and SIWF login integrated
- [ ] `ContestEscrow.sol` written and fully unit-tested locally
- [ ] Contract deployed to Base Sepolia
- [ ] Oracle integration live (Chainlink/Pyth reads on Sepolia or a testnet-safe equivalent)
- [ ] Entry, lock/snapshot, settle, and claim flows all wired to the real contract with testnet ETH
- **Definition of Done:** A full contest — entry fee payment, lock, oracle-based settlement, payout claim — runs successfully end-to-end on Base Sepolia with real testnet transactions, verifiable on a block explorer.

### Phase 2 — Mainnet Launch
- [ ] Section 8 security checklist fully complete
- [ ] Contract redeployed to Base mainnet
- [ ] Small-stakes soft launch (low entry fees, capped prize pools) before scaling up
- [ ] Monitoring/alerting in place for contract balance, failed settlements, oracle gaps
- **Definition of Done:** Real-money contest runs successfully on mainnet with monitoring confirming correct escrow, settlement, and payout behavior.

---

## 10. Environment Variables / Secrets Checklist

```
DATABASE_URL
NEXT_PUBLIC_APP_URL
FARCASTER_MANIFEST_SIGNATURE
BASE_SEPOLIA_RPC_URL
BASE_MAINNET_RPC_URL
REPORTER_PRIVATE_KEY        (backend snapshot/settle signer — never the admin key)
ADMIN_PRIVATE_KEY_OR_MULTISIG_ADDRESS
CHAINLINK_FEED_ADDRESSES    (per coin)
PYTH_ENDPOINT_AND_FEED_IDS  (per coin)
```

---

## 11. Note for the Agent on Scope Discipline

If a requested task in Phase 0 or 1 seems to require a Phase 2 concern (e.g., mainnet gas optimization, legal compliance flows), flag it and defer rather than building it early — premature complexity in an early phase is its own form of incomplete implementation, since it adds surface area that can't be properly tested yet.
