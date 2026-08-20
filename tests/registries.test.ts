import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { ModelRegistry } from "../core/models/ModelRegistry";
import { RoleRegistry } from "../core/roles/RoleRegistry";
import { ToolRegistry } from "../core/tools/ToolRegistry";
import { TraceRecorder } from "../core/trace/TraceRecorder";

describe("registries", () => {
  it("maps logical roles independently from providers", () => {
    const roles = new RoleRegistry({ explorer: "fast", coder: "strong", reviewer: "fast" });
    expect(roles.modelFor("coder")).toBe("strong");
    roles.bind("reviewer", "strict");
    expect(roles.modelFor("reviewer")).toBe("strict");
  });

  it("creates a model provider lazily and caches it", () => {
    const factory = vi.fn(() => ({ chat: vi.fn() }));
    const registry = new ModelRegistry(factory);
    registry.register({ id: "local", displayName: "Local", baseUrl: "http://localhost:8000/v1", model: "qwen" });
    expect(registry.get("local")).toBe(registry.get("local"));
    expect(factory).toHaveBeenCalledOnce();
  });

  it("validates tool arguments before execution", async () => {
    const tools = new ToolRegistry();
    const execute = vi.fn(async ({ value }: { value: string }) => value);
    tools.register({ name: "echo", description: "echo", schema: z.object({ value: z.string() }), jsonSchema: {}, execute });
    const context = { workspaceRoot: process.cwd(), trace: new TraceRecorder() };
    await expect(tools.execute("echo", { value: 3 }, context)).rejects.toThrow();
    await expect(tools.execute("echo", { value: "ok" }, context)).resolves.toBe("ok");
  });
});
