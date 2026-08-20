import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveWorkspacePath } from "../core/tools/pathSafety";

describe("resolveWorkspacePath", () => {
  const root = path.resolve("workspace");
  it("resolves workspace-relative paths", () => expect(resolveWorkspacePath(root, "src/index.ts")).toBe(path.join(root, "src", "index.ts")));
  it("rejects traversal", () => expect(() => resolveWorkspacePath(root, "../secret.txt")).toThrow("escapes"));
  it("rejects absolute paths", () => expect(() => resolveWorkspacePath(root, path.resolve("secret.txt"))).toThrow("workspace-relative"));
});
