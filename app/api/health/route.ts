import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPublicEnv } from "@/lib/env";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    return Response.json({
      ok: true,
      app: getPublicEnv(),
      database: "reachable",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Prisma.PrismaClientInitializationError ? error.message : "Database check failed";

    return Response.json(
      {
        ok: false,
        app: getPublicEnv(),
        database: "unreachable",
        error: message,
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
