# CryptoFantasy — Complete Game Rules (v0.1 Draft)

## 1. The Big Idea

Users draft a **roster of 5 cryptocurrencies** under a **salary cap**, lock it in before a contest window starts, and score points based on **how much each coin's price moves** during that window. Highest total score wins a share of the prize pool, which is made up of everyone's entry fees.

Think Dream11 / DraftKings, but the "athletes" are coins and "performance" is price change.

---

## 2. Roster & Draft Rules

- **Roster size:** 5 coins per lineup.
- **Format variants:**
  - *Quick Play* — 3 coins, short window (1–4 hrs), higher variance.
  - *Classic* — 5 coins, 24-hour window.
  - *Weekly* — 5 coins, 7-day window, lower variance, more "skill over luck."
- **Salary cap:** Each user gets a fixed budget (e.g., $50,000 in-game salary, unrelated to entry fee) to spend drafting their 5 coins.
- **Eligible coin pool:** Curated list of ~60–80 coins (see Section 3) — not the entire market.
- **One coin per slot:** No duplicate coins in a single roster.
- **Lineup lock:** Once the contest start time hits, rosters are frozen. No swaps, no edits — same as a fantasy lineup locking at kickoff.

### Example Roster (Classic, $50,000 cap)

| Slot | Coin | Salary |
|------|------|--------|
| 1 | BTC | $20,000 |
| 2 | ETH | $14,000 |
| 3 | SOL | $8,000 |
| 4 | DOGE | $4,000 |
| 5 | PEPE | $1,500 |
| | **Total** | **$47,500 / $50,000** |

---

## 3. The Coin Pool (Who's Eligible to Draft)

Not every token qualifies — this is a core anti-manipulation safeguard.

**Inclusion criteria:**
- Top ~80–100 coins by market cap
- Listed on at least 2–3 major exchanges (for reliable price feeds)
- Minimum 24h trading volume threshold (e.g., $10M+) — keeps out thin, easily-pumped coins
- Excludes stablecoins (USDT, USDC, etc.) — they can't move, so they'd be "free points" or dead weight
- Excludes wrapped/pegged/synthetic tokens (wBTC, stETH, etc.) — redundant with their underlying asset

**Tiering (drives salary):**
- **Tier 1 – Majors:** BTC, ETH (highest salary, lowest volatility)
- **Tier 2 – Mid-caps:** SOL, BNB, XRP, ADA, AVAX, etc.
- **Tier 3 – Small-caps/Meme:** DOGE, PEPE, SHIB, etc. (lowest salary, highest volatility — boom or bust picks)

---

## 4. Salary Cap & Pricing System

**Principle:** Salary = how "safe" a coin is, not its dollar price. A coin's salary should scale roughly with market cap (often log-scaled, not linear) so a single mega-cap doesn't make every other coin meaningless by comparison.

**Why this matters:** If salaries were linear with market cap, BTC could cost 1,000x more than a small-cap — making small-caps "too cheap to matter" or majors "impossible to afford." Log-scaling keeps every tier strategically relevant.

**Recalculation cadence:** Salaries should update periodically (e.g., daily) based on recent market cap and volatility — not be fixed forever. This is similar to how DFS platforms update player "salaries" week to week based on recent performance.

**Cap calibration target:** The total cap should be tuned (via simulation before launch) so that:
- An all-majors roster (e.g., BTC+ETH+BNB+XRP+ADA) *barely exceeds or just fits* the cap — discouraging "safe-only" play.
- A balanced roster (2 majors + 2-3 mid/small) comfortably fits with room to spare.

This tension — safe-but-expensive vs. cheap-but-volatile — *is* the strategy layer of the entire game.

---

## 5. Scoring System

**Scoring formula:** Each coin in your roster scores its **raw percentage price change** over the contest window. Your team score = the **sum** of all 5 coins' % changes.

> Important: Salary does **not** affect scoring — it only affects what you could *afford* to draft. Once locked, every roster slot counts equally regardless of cost. (If salary multiplied scoring too, the cap would be redundant.)

### Example Scoring (24h Classic contest)

| Coin | Price Change |
|------|---------------|
| BTC | +2.0% |
| ETH | +1.5% |
| SOL | −3.0% |
| DOGE | +8.0% |
| PEPE | +25.0% |
| **Team Total** | **+33.5 points** |

A rival roster that went all-majors (BTC, ETH, BNB, XRP, ADA) might score something like +1.8% total — safe, but unlikely to win. This is the intended dynamic: majors anchor your floor, volatile picks create your ceiling.

### Optional Mechanics

- **Captain multiplier:** Designate 1 of your 5 coins as "Captain" — that coin's % change counts 2x (gain or loss). Adds a prediction layer on top of roster construction.
- **Negative scores:** A roster can finish with a negative total if losers outweigh gainers — this is expected and fine; it's relative ranking against the field that determines payout, not an absolute score floor.

---

## 6. Price Source & Snapshot Rules (Critical for Fairness)

- **Never use a single price tick** for lock-in or settlement — a single data point on a small-cap coin can be manipulated by a whale trade seconds before the snapshot.
- **Use a TWAP (time-weighted average price)** — e.g., averaged over the 3–5 minutes before lock and before settlement — sourced from a decentralized oracle (Chainlink is the industry standard) pulling from multiple exchanges.
- **Start price** = TWAP at contest lock. **End price** = TWAP at contest close. % change is calculated from these two TWAPs, not spot prices.

---

## 7. Contest Structure & Payouts

- **Entry fee:** Set per contest (e.g., $5, $10, $50 buy-in tiers).
- **Prize pool:** Sum of all entries, held in escrow by a smart contract.
- **Platform rake:** Typically 5–15% of the pool taken off the top (standard in DFS) — must be clearly disclosed before entry.
- **Payout structure options:**
  - *Winner-take-all* — highest score takes the whole pool minus rake. High variance, simple.
  - *Top-N paid* (e.g., top 20%) — graduated payouts, smaller average win but better retention since more people "cash."
- **Multi-entry limits:** Cap how many lineups one wallet can submit per contest (e.g., max 3–5). Unlimited entries let "sharks" flood contests and farm casual players — a major complaint in real-world DFS.

---

## 8. Tiebreakers

Decide and disclose upfront. Common options:
1. Total salary used (closer to full cap wins tie)
2. The single best-performing coin in the roster
3. Time of lineup submission (earlier wins)

---

## 9. Edge Cases You'll Need Rules For

These are the scenarios that don't come up until contest #50 and cause disputes if undefined:

- **Coin delisted or depegs mid-contest** (e.g., an exchange halts trading) — define a fallback: freeze that coin's score at last valid TWAP, or void and refund affected entries.
- **Exchange outage during snapshot window** — oracle should already be pulling from multiple exchanges so one outage doesn't break settlement; define what happens if *all* sources fail.
- **Extreme volatility / flash crash** — consider a max score cap per coin (e.g., ±100%) so one freak wick doesn't make every other entry irrelevant.
- **New coin listed mid-season** — define how/when new coins enter the eligible pool and get their initial salary tier.
- **Tie in final score** — resolved by the tiebreaker rules in Section 8, applied in order until broken.
- **User disconnects/app crashes after lineup submission but before lock** — as long as the transaction confirmed on-chain before lock time, the lineup stands; off-chain UI issues shouldn't affect on-chain state.
- **Contest doesn't fill (not enough entries)** — define a minimum entry threshold; below it, auto-refund everyone rather than running an empty contest.

---

## 10. Anti-Manipulation & Fair Play Rules

- **No wash trading protection needed on your end** — but coin eligibility (Section 3) is your main defense against thin, manipulable markets.
- **Multi-wallet abuse:** A single person could create many wallets to bypass the multi-entry cap. Consider light identity/KYC checks for cash-out, even if entry is permissionless.
- **Insider timing:** Since lineups lock at a public, fixed time, there's no "insider" advantage like in traditional fantasy (no injury reports to leak). This is actually a structural advantage of crypto fantasy over sports fantasy.
- **Oracle manipulation:** This is your single biggest technical risk — a compromised or manipulable price feed undermines the entire game's integrity. Budget real engineering time here; don't roll your own price feed.

---

## 11. Settlement Flow (How It All Resolves On-Chain)

1. User connects wallet → pays entry fee → fee goes into a contract-held escrow for that contest.
2. User submits roster (5 coins, captain choice if enabled) → stored on-chain or in a verifiable off-chain store with on-chain hash commitment.
3. Contest lock time hits → oracle TWAP recorded as each coin's start price.
4. Contest close time hits → oracle TWAP recorded as each coin's end price.
5. Smart contract (or a verifiable off-chain scoring service that posts results on-chain) calculates every roster's score.
6. Contract ranks all entries, applies payout structure, and distributes the pool automatically — no admin can alter results after the fact.

---

## 12. Open Questions to Resolve Before Building

- Real-money entry in which jurisdictions? (Skill-game legality varies significantly by region/state — flag for legal review, not a build decision.)
- Fully on-chain scoring (trustless, gas-heavy) vs. off-chain scoring with on-chain settlement (cheaper, needs a trust/verification layer)?
- Stablecoin or native token for entry fees and payouts?
- Will Captain mode and Quick Play ship in v1, or are they v2 additions once the core loop is validated?

---

*This is a living draft — treat it as the spec to argue with, not a final answer. Next step is usually to pressure-test the salary cap math with simulated historical price data before writing a line of contract code.*

