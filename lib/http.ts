import { ZodError } from "zod";
import { AppError, isAppError } from "@/lib/errors";

export function withRouteErrorHandling(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async function routeHandler(request: Request) {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ZodError) {
        return Response.json(
          {
            error: {
              code: "VALIDATION_FAILED",
              message: "The request payload failed validation.",
              details: error.flatten(),
            },
          },
          { status: 400 },
        );
      }

      if (isAppError(error)) {
        return Response.json(
          {
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          },
          { status: error.statusCode },
        );
      }

      return Response.json(
        {
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Unexpected server error.",
          },
        },
        { status: 500 },
      );
    }
  };
}

export function assert(condition: unknown, error: AppError): asserts condition {
  if (!condition) {
    throw error;
  }
}
