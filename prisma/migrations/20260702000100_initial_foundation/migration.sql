CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "ContestPhase" AS ENUM ('phase0', 'phase1', 'phase2');
CREATE TYPE "CoinTier" AS ENUM ('major', 'mid', 'small');
CREATE TYPE "OracleSource" AS ENUM ('chainlink', 'pyth');
CREATE TYPE "ContestFormat" AS ENUM ('quick', 'classic', 'weekly');
CREATE TYPE "ContestStatus" AS ENUM ('draft', 'open', 'locked', 'closed', 'settled', 'refunded', 'cancelled');
CREATE TYPE "RosterStatus" AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
CREATE TYPE "SnapshotType" AS ENUM ('lock', 'close');
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'claimable', 'claimed', 'refunded', 'voided');
CREATE TYPE "TransactionType" AS ENUM ('entry', 'payout', 'refund');
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'confirmed', 'failed', 'cancelled');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fid" BIGINT UNIQUE,
  "wallet_address" VARCHAR(64) UNIQUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "coins" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "symbol" VARCHAR(16) NOT NULL UNIQUE,
  "name" VARCHAR(64) NOT NULL,
  "tier" "CoinTier" NOT NULL,
  "current_salary" INTEGER NOT NULL,
  "market_cap_usd" DECIMAL(30, 6) NOT NULL,
  "oracle_feed_address" VARCHAR(128) NOT NULL,
  "oracle_source" "OracleSource" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_salary_update_at" TIMESTAMPTZ(6),
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "contests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" VARCHAR(80) NOT NULL UNIQUE,
  "title" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "phase" "ContestPhase" NOT NULL,
  "format" "ContestFormat" NOT NULL,
  "status" "ContestStatus" NOT NULL DEFAULT 'open',
  "entry_fee_wei" BIGINT NOT NULL DEFAULT 0,
  "salary_cap" INTEGER NOT NULL,
  "prize_pool_wei" BIGINT NOT NULL DEFAULT 0,
  "rake_bps" INTEGER NOT NULL DEFAULT 1000,
  "max_entries_per_user" INTEGER NOT NULL,
  "min_entries_required" INTEGER NOT NULL,
  "lock_time" TIMESTAMPTZ(6) NOT NULL,
  "close_time" TIMESTAMPTZ(6) NOT NULL,
  "contract_address" VARCHAR(64),
  "contract_contest_id" BIGINT,
  "payout_structure" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "tiebreaker_policy" JSONB NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contests_close_after_lock" CHECK ("close_time" > "lock_time")
);

CREATE TABLE "rosters" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contest_id" UUID NOT NULL REFERENCES "contests"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "captain_coin_id" UUID,
  "salary_used" INTEGER NOT NULL,
  "commitment_hash" VARCHAR(66),
  "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tx_hash" VARCHAR(66),
  "status" "RosterStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "roster_coins" (
  "roster_id" UUID NOT NULL REFERENCES "rosters"("id") ON DELETE CASCADE,
  "coin_id" UUID NOT NULL REFERENCES "coins"("id") ON DELETE RESTRICT,
  "slot_number" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("roster_id", "slot_number"),
  UNIQUE ("roster_id", "coin_id")
);

CREATE TABLE "price_snapshots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contest_id" UUID NOT NULL REFERENCES "contests"("id") ON DELETE CASCADE,
  "coin_id" UUID NOT NULL REFERENCES "coins"("id") ON DELETE RESTRICT,
  "snapshot_type" "SnapshotType" NOT NULL,
  "twap_price_usd" DECIMAL(30, 10) NOT NULL,
  "sample_count" INTEGER NOT NULL,
  "window_start" TIMESTAMPTZ(6) NOT NULL,
  "window_end" TIMESTAMPTZ(6) NOT NULL,
  "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("contest_id", "coin_id", "snapshot_type")
);

CREATE TABLE "price_samples" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "price_snapshot_id" UUID NOT NULL REFERENCES "price_snapshots"("id") ON DELETE CASCADE,
  "contest_id" UUID NOT NULL,
  "coin_id" UUID NOT NULL REFERENCES "coins"("id") ON DELETE RESTRICT,
  "sample_index" INTEGER NOT NULL,
  "price_usd" DECIMAL(30, 10) NOT NULL,
  "source_timestamp" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("price_snapshot_id", "sample_index")
);

CREATE TABLE "results" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contest_id" UUID NOT NULL REFERENCES "contests"("id") ON DELETE CASCADE,
  "roster_id" UUID NOT NULL UNIQUE REFERENCES "rosters"("id") ON DELETE CASCADE,
  "raw_score" DECIMAL(20, 10) NOT NULL,
  "final_score" DECIMAL(20, 10) NOT NULL,
  "rank" INTEGER NOT NULL,
  "payout_amount" BIGINT NOT NULL DEFAULT 0,
  "payout_status" "PayoutStatus" NOT NULL DEFAULT 'pending',
  "payout_tx_hash" VARCHAR(66),
  "tiebreak_meta" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("contest_id", "rank")
);

CREATE TABLE "transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "contest_id" UUID NOT NULL REFERENCES "contests"("id") ON DELETE CASCADE,
  "type" "TransactionType" NOT NULL,
  "amount_wei" BIGINT NOT NULL,
  "tx_hash" VARCHAR(66),
  "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "coins_is_active_tier_idx" ON "coins" ("is_active", "tier");
CREATE INDEX "contests_phase_status_lock_time_idx" ON "contests" ("phase", "status", "lock_time");
CREATE INDEX "rosters_contest_id_user_id_idx" ON "rosters" ("contest_id", "user_id");
CREATE INDEX "transactions_contest_id_type_status_idx" ON "transactions" ("contest_id", "type", "status");
