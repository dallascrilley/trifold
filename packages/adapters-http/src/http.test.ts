import { createTasksRegistry } from "@trifold/ops";
import { describe, expect, it } from "vitest";
import { createHttpApp } from "./create-app.js";

describe("HTTP adapter", () => {
  it("healthz", async () => {
    const { registry } = createTasksRegistry();
    const app = createHttpApp(registry);
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("create requires api key", async () => {
    const { registry } = createTasksRegistry();
    const app = createHttpApp(registry);
    const res = await app.request("/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("create, list, get, complete", async () => {
    const { registry } = createTasksRegistry();
    const app = createHttpApp(registry);
    const headers = {
      "content-type": "application/json",
      "x-api-key": "dev-key",
    };

    const createRes = await app.request("/tasks", {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Ship it" }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; title: string };
    expect(created.title).toBe("Ship it");

    const listRes = await app.request("/tasks");
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { tasks: { id: string }[] };
    expect(listed.tasks.some((t) => t.id === created.id)).toBe(true);

    const getRes = await app.request(`/tasks/${created.id}`);
    expect(getRes.status).toBe(200);

    const completeRes = await app.request(`/tasks/${created.id}/complete`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    expect(completeRes.status).toBe(200);
    const completed = (await completeRes.json()) as { done: boolean };
    expect(completed.done).toBe(true);
  });

  it("validation error returns 400", async () => {
    const { registry } = createTasksRegistry();
    const app = createHttpApp(registry);
    const res = await app.request("/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "dev-key",
      },
      body: JSON.stringify({ title: "" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
