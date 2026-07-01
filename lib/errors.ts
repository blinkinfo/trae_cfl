export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode?: number;
  details?: unknown;
};

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor({ code, message, statusCode = 500, details }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
