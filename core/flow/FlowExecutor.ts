import { z } from "zod";
import type { RoleName } from "../roles/Role";
import type { TraceRecorder } from "../trace/TraceRecorder";
import type { ExplorerResult, FlowConfig, FlowResult, ReviewResult } from "./Flow";

const explorerSchema = z.object({
  relevantFiles: z.array(z.string()),
  findings: z.array(z.string()),
  recommendedEditTargets: z.array(z.string()),
});
const reviewSchema = z.object({
  approved: z.boolean(),
  findings: z.array(z.object({ severity: z.enum(["low", "medium", "high"]), message: z.string() })),
});

export interface RoleRunner { run(role: RoleName, task: string, context?: string): Promise<string> }

export class FlowExecutor {
  constructor(private readonly runner: RoleRunner, private readonly trace: TraceRecorder) {}

  async execute(task: string, config: FlowConfig): Promise<FlowResult> {
    const explorerText = await this.runner.run("explorer", task);
    const explorer = parseStructured(explorerText, explorerSchema, { relevantFiles: [], findings: [explorerText], recommendedEditTargets: [] });
    const context = `Repository findings:\n${JSON.stringify(explorer, null, 2)}`;
    const validation = `After editing, run this validation command: ${config.validationCommand}`;
    const coderSummaries = [await this.runner.run("coder", task, `${context}\n${validation}`)];
    let review = await this.review(task, context, coderSummaries.at(-1) ?? "");
    let revisions = 0;

    while (!review.approved && revisions < config.maxReviewerLoops) {
      revisions += 1;
      const findings = `Reviewer requested revision:\n${JSON.stringify(review.findings, null, 2)}`;
      coderSummaries.push(await this.runner.run("coder", task, `${context}\n${findings}\n${validation}`));
      review = await this.review(task, context, coderSummaries.at(-1) ?? "");
    }

    return { explorer, coderSummaries, review, revisions };
  }

  private async review(task: string, context: string, coderSummary: string): Promise<ReviewResult> {
    const response = await this.runner.run("reviewer", task, `${context}\nCoder summary:\n${coderSummary}\nInspect the current git diff and diagnostics.`);
    const fallback: ReviewResult = { approved: false, findings: [{ severity: "high", message: "Reviewer returned an invalid structured response." }] };
    const review = parseStructured(response, reviewSchema, fallback);
    this.trace.record("review", review.approved ? "Reviewer approved the change" : `Reviewer requested changes (${review.findings.length})`, { role: "reviewer" });
    return review;
  }
}

function parseStructured<T>(text: string, schema: z.ZodType<T>, fallback: T): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try { return schema.parse(JSON.parse(candidate)); }
  catch { return fallback; }
}
