/** 공통 에러·응답 규격 (tech-design §6.8 / §7) */
export type ErrorCode = "BAD_REQUEST" | "NOT_FOUND" | "UPSTREAM" | "DB_ERROR" | "INTERNAL";

export interface ApiError { code: ErrorCode; message: string; }
export interface ApiEnvelope<T> { ok: boolean; data?: T; error?: ApiError; }

export function ok<T>(data: T): ApiEnvelope<T> { return { ok: true, data }; }
export function fail(code: ErrorCode, message: string): ApiEnvelope<never> {
  return { ok: false, error: { code, message } };
}
export function httpStatus(code: ErrorCode): number {
  switch (code) {
    case "BAD_REQUEST": return 400;
    case "NOT_FOUND": return 404;
    case "UPSTREAM": return 502;
    case "DB_ERROR": return 500;
    default: return 500;
  }
}
