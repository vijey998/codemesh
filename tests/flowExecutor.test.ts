import { describe, expect, it, vi } from "vitest";
import { FlowExecutor, type RoleRunner } from "../core/flow/FlowExecutor";
import type { RoleName } from "../core/roles/Role";
import { TraceRecorder } from "../core/trace/TraceRecorder";

function scripted(responses: Partial<Record<RoleName, string[]>>): RoleRunner {
  return { run: vi.fn(async (role: RoleName) => responses[role]?.shift() ?? "") };
}

const explorer = JSON.stringify({ relevantFiles: ["src/a.ts"], findings: ["Found target"], recommendedEditTargets: ["src/a.ts"] });

describe("FlowExecutor", () => {
  it("ends when the first review approves", async () => {
    const runner = scripted({ explorer: [explorer], coder: ["Implemented"], reviewer: [JSON.stringify({ approved: true, findings: [] })] });
    const result = await new FlowExecutor(runner, new TraceRecorder()).execute("Fix it", { maxReviewerLoops: 1, validationCommand: "npm test" });
    expect(result.review.approved).toBe(true);
    expect(result.revisions).toBe(0);
    expect(runner.run).toHaveBeenCalledTimes(3);
  });

  it("revises once after rejection", async () => {
    const runner = scripted({
      explorer: [explorer], coder: ["First pass", "Revision"],
      reviewer: [JSON.stringify({ approved: false, findings: [{ severity: "medium", message: "Handle empty input" }] }), JSON.stringify({ approved: true, findings: [] })],
    });
    const result = await new FlowExecutor(runner, new TraceRecorder()).execute("Fix it", { maxReviewerLoops: 1, validationCommand: "npm test" });
    expect(result.review.approved).toBe(true);
    expect(result.revisions).toBe(1);
    expect(result.coderSummaries).toHaveLength(2);
  });

  it("stops at the configured revision limit", async () => {
    const rejected = JSON.stringify({ approved: false, findings: [{ severity: "high", message: "Still broken" }] });
    const runner = scripted({ explorer: [explorer], coder: ["First", "Second"], reviewer: [rejected, rejected] });
    const result = await new FlowExecutor(runner, new TraceRecorder()).execute("Fix it", { maxReviewerLoops: 1, validationCommand: "npm test" });
    expect(result.review.approved).toBe(false);
    expect(result.revisions).toBe(1);
  });
});
