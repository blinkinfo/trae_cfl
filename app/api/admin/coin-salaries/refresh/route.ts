import { CoinGeckoMarketDataProvider } from "@/lib/coins/coingecko";
import {
  createPrismaCoinPoolRefreshRepository,
  executeCoinPoolRefresh,
} from "@/lib/coins/refresh";
import { getOracleCatalog } from "@/lib/coins/oracles";
import { assertAdminJobAuthorized } from "@/lib/admin";
import { withRouteErrorHandling } from "@/lib/http";
import { refreshCoinPoolRequestSchema } from "@/lib/validation/coins";

export const POST = withRouteErrorHandling(async (request) => {
  assertAdminJobAuthorized(request);

  const rawBody = await request
    .json()
    .catch(() => ({} satisfies Record<string, never>));
  const parsed = refreshCoinPoolRequestSchema.parse(rawBody);

  const result = await executeCoinPoolRefresh({
    provider: new CoinGeckoMarketDataProvider(),
    repository: createPrismaCoinPoolRefreshRepository(),
    oracleCatalog: getOracleCatalog(),
    dryRun: parsed.dryRun,
    triggeredBy: parsed.triggeredBy ?? "admin-api",
  });

  return Response.json({ data: result });
});

export const dynamic = "force-dynamic";
