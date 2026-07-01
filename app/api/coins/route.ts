import { db } from "@/lib/db";
import { withRouteErrorHandling } from "@/lib/http";
import { coinListQuerySchema } from "@/lib/validation/coins";

export const GET = withRouteErrorHandling(async (request) => {
  const parsed = coinListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  const coins = await db.coin.findMany({
    where: {
      isActive: parsed.active,
      tier: parsed.tier,
    },
    orderBy: [{ tier: "asc" }, { marketCapUsd: "desc" }],
    select: {
      id: true,
      symbol: true,
      name: true,
      tier: true,
      currentSalary: true,
      marketCapUsd: true,
      oracleSource: true,
      oracleFeedAddress: true,
      isActive: true,
      lastSalaryUpdateAt: true,
    },
  });

  return Response.json({ data: coins });
});

export const dynamic = "force-dynamic";
