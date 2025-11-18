import { z } from "zod";

export const flowConfigSchema = z.object({
  maxReviewerLoops: z.number().int().min(0).max(3).default(1),
  validationCommand: z.string().min(1).default("npm test"),
});

export type FlowConfig = z.infer<typeof flowConfigSchema>;

export interface ExplorerResult {
  relevantFiles: string[];
  findings: string[];
  recommendedEditTargets: string[];
}

export interface ReviewFinding { severity: "low" | "medium" | "high"; message: string }
export interface ReviewResult { approved: boolean; findings: ReviewFinding[] }

export interface FlowResult {
  explorer: ExplorerResult;
  coderSummaries: string[];
  review: ReviewResult;
  revisions: number;
}
