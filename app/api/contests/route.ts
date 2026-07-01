import { ContestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { withRouteErrorHandling } from "@/lib/http";
import { contestListQuerySchema } from "@/lib/validation/contests";

export const GET = withRouteErrorHandling(async (request) => {
  const parsed = contestListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  const contests = await db.contest.findMany({
    where: {
      status: parsed.status as ContestStatus | undefined,
      phase: parsed.phase,
    },
    orderBy: [{ lockTime: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      phase: true,
      format: true,
      status: true,
      entryFeeWei: true,
      salaryCap: true,
      prizePoolWei: true,
      lockTime: true,
      closeTime: true,
      maxEntriesPerUser: true,
      minEntriesRequired: true,
    },
  });

  return Response.json({ data: contests });
});

export const dynamic = "force-dynamic";
