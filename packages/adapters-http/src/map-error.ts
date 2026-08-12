import { isAppError, toAppError } from "@trifold/core";
import type { Context } from "hono";

export function httpErrorResponse(c: Context, err: unknown) {
  const appErr = isAppError(err) ? err : toAppError(err);
  return c.json(appErr.toJSON(), appErr.status as 400);
}
