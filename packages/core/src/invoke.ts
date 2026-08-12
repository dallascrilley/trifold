import { ZodError } from "zod";
import { AppError, toAppError } from "./errors.js";
import type { Registry } from "./registry.js";
import type { RequestContext } from "./types.js";

export async function invokeOperation(
  registry: Registry,
  id: string,
  rawInput: unknown,
  ctx: RequestContext,
): Promise<unknown> {
  const op = registry.get(id);

  let input: unknown;
  try {
    input = op.input.parse(rawInput ?? {});
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError("VALIDATION_ERROR", "Invalid input", {
        status: 400,
        details: err.flatten(),
      });
    }
    throw err;
  }

  let result: unknown;
  try {
    result = await op.handler(ctx, input);
  } catch (err) {
    throw toAppError(err);
  }

  try {
    return op.output.parse(result);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError("INTERNAL", "Handler returned invalid output", {
        status: 500,
        details: err.flatten(),
      });
    }
    throw err;
  }
}
