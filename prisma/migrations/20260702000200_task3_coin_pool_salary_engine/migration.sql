CREATE TYPE "SalaryRefreshRunStatus" AS ENUM ('running', 'succeeded', 'failed', 'dry_run');

CREATE TABLE "salary_refresh_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "source" VARCHAR(40) NOT NULL,
  "status" "SalaryRefreshRunStatus" NOT NULL,
  "dry_run" BOOLEAN NOT NULL DEFAULT FALSE,
  "triggered_by" VARCHAR(80) NOT NULL,
  "candidate_count" INTEGER NOT NULL DEFAULT 0,
  "eligible_count" INTEGER NOT NULL DEFAULT 0,
  "ineligible_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  "error_code" VARCHAR(64),
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX "salary_refresh_runs_status_started_at_idx"
  ON "salary_refresh_runs" ("status", "started_at");
