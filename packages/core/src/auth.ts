import { AppError } from "./errors.js";
import type { Actor, AuthInfo, AuthRequirement, OperationDef } from "./types.js";

export type Credentials = {
  apiKey?: string;
  bearer?: string;
};

export type AuthResult = {
  actor?: Actor;
  auth?: AuthInfo;
};

function validKeys(): Set<string> {
  const multi = process.env.APP_API_KEYS;
  const single = process.env.APP_API_KEY;
  const keys = new Set<string>();
  if (multi) {
    for (const k of multi.split(",")) {
      const t = k.trim();
      if (t) keys.add(t);
    }
  }
  if (single?.trim()) keys.add(single.trim());
  // Dev-only default so local samples work without env setup.
  // Never invent credentials when NODE_ENV=production.
  if (keys.size === 0 && process.env.NODE_ENV !== "production") {
    keys.add("dev-key");
  }
  return keys;
}

function tokenRef(token: string): string {
  if (token.length <= 4) return "****";
  return `…${token.slice(-4)}`;
}

export function resolveCredentialsFromEnv(): Credentials {
  return {
    apiKey: process.env.APP_API_KEY,
    bearer: process.env.APP_TOKEN,
  };
}

export function authorize(
  op: OperationDef,
  credentials: Credentials,
): AuthResult {
  const requirement: AuthRequirement = op.meta.auth ?? "none";

  if (requirement === "none") {
    return {
      actor: { id: "anonymous", kind: "anonymous" },
    };
  }

  const keys = validKeys();

  if (requirement === "apiKey") {
    const key = credentials.apiKey;
    if (!key || !keys.has(key)) {
      throw new AppError("UNAUTHORIZED", "Valid API key required", { status: 401 });
    }
    return {
      actor: { id: `key:${tokenRef(key)}`, kind: "service" },
      auth: { type: "apiKey", tokenRef: tokenRef(key) },
    };
  }

  // bearer
  const token = credentials.bearer ?? credentials.apiKey;
  if (!token || !keys.has(token)) {
    throw new AppError("UNAUTHORIZED", "Valid bearer token required", { status: 401 });
  }
  return {
    actor: { id: `bearer:${tokenRef(token)}`, kind: "user" },
    auth: { type: "bearer", tokenRef: tokenRef(token) },
  };
}
