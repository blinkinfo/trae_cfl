# CryptoFantasy Platform Baseline

Production-ready baseline for Tasks 1 and 2 of the approved `build-crypto-fantasy-platform` spec.

## Stack Decisions
- App framework: Next.js App Router with TypeScript
- Package manager: npm
- UI styling: Tailwind CSS v4
- Validation and domain contracts: Zod plus typed domain modules in `lib/`
- Database toolkit: Prisma ORM with PostgreSQL migrations committed to `prisma/migrations`
- Test runner: Vitest for domain and validation logic
- Solidity tooling boundary: `contracts/` is reserved now; Hardhat is the Phase 1 contract toolchain once escrow implementation begins
- Deployment target: Vercel or another Node-compatible Next.js host for the mini app and API, managed PostgreSQL for application data, Base Sepolia then Base Mainnet for contracts by phase

## Phase Boundaries
- Phase 0: Points-only gameplay, real oracle-backed prices, no wallet-required entry or smart-contract payout flow
- Phase 1: Farcaster authentication, Base Sepolia escrow deployment, and end-to-end testnet money flow after Phase 0 definition of done is complete
- Phase 2: Mainnet hardening, security review evidence, monitoring, and compliance gates before any real-money enablement

## Project Layout
- `app/`: App Router pages, global styles, and HTTP route handlers under `app/api`
- `components/`: Reusable UI building blocks
- `contracts/`: Reserved Solidity workspace and phase notes
- `lib/`: Environment parsing, Prisma client, domain contracts, validation, and shared API utilities
- `prisma/`: Source schema and SQL migration history
- `tests/`: Vitest coverage for domain and validation logic
- `.trae/specs/`: Approved implementation spec and task list kept as source of truth

## Environment Setup
1. Copy `.env.example` to `.env.local` for local development.
2. Point `DATABASE_URL` at a PostgreSQL database before running Prisma commands.
3. Keep private keys and feed configuration out of version control.
4. Set `ADMIN_JOB_SECRET` before using the protected salary refresh endpoint.
5. Run `npm install`, `npm run db:generate`, then `npm run check`.

## Coin Pool Refresh
- `POST /api/admin/coin-salaries/refresh`: Protected admin trigger for curated coin ingestion and salary refresh
- Authorization: `Bearer ${ADMIN_JOB_SECRET}`
- Request body: `{ "dryRun": true }` for a no-write validation pass, or omit `dryRun` to persist the refreshed active pool
- Feed config: `CHAINLINK_FEED_ADDRESSES` and `PYTH_ENDPOINT_AND_FEED_IDS` should be JSON maps keyed by coin symbol, for example `{"BTC":"0x..."}` or `{"DOGE":"0x..."}` so oracle availability can be enforced during ingestion

## Commands
- `npm run dev`: Start the Next.js development server
- `npm run check`: Lint, typecheck, and run unit tests
- `npm run build`: Create a production build
- `npm run db:deploy`: Apply committed SQL migrations to PostgreSQL
