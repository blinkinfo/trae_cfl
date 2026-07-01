import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";

function toComparableBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

export function assertAdminJobAuthorized(request: Request) {
  const env = getEnv();

  if (!env.ADMIN_JOB_SECRET) {
    throw new AppError({
      code: "ADMIN_JOB_NOT_CONFIGURED",
      message: "ADMIN_JOB_SECRET must be configured before admin refresh jobs can run.",
      statusCode: 503,
    });
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError({
      code: "ADMIN_UNAUTHORIZED",
      message: "A valid Bearer token is required for this admin operation.",
      statusCode: 401,
    });
  }

  const providedSecret = authorization.slice("Bearer ".length).trim();
  const expected = toComparableBuffer(env.ADMIN_JOB_SECRET);
  const provided = toComparableBuffer(providedSecret);

  const valid =
    expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!valid) {
    throw new AppError({
      code: "ADMIN_UNAUTHORIZED",
      message: "The provided admin token is invalid.",
      statusCode: 401,
    });
  }
}
