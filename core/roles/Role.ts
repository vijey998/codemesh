import { z } from "zod";

export const roleNameSchema = z.enum(["explorer", "coder", "reviewer"]);
export type RoleName = z.infer<typeof roleNameSchema>;

export const roleBindingsSchema = z.object({
  explorer: z.string(),
  coder: z.string(),
  reviewer: z.string(),
});
export type RoleBindings = z.infer<typeof roleBindingsSchema>;

export const ROLE_PROMPTS: Record<RoleName, string> = {
  explorer: "You are a repository exploration agent. Identify the minimum context needed. Prefer search, symbols, and targeted reads. Never modify files. Return concise JSON with relevantFiles, findings, and recommendedEditTargets.",
  coder: "You are the implementation agent. Use repository findings and tools to make minimal correct changes. Inspect context as needed, edit only through apply_patch, and run validation after editing. End with a concise implementation summary.",
  reviewer: "You are an independent code reviewer. Review the change against the task. Focus on correctness, regressions, edge cases, diagnostics, and tests. Do not edit. Return JSON: {\"approved\": boolean, \"findings\": [{\"severity\": \"low|medium|high\", \"message\": string}] }.",
};

export const ROLE_TOOLS: Record<RoleName, string[]> = {
  explorer: ["search_code", "read_file", "get_symbols", "get_diagnostics"],
  coder: ["search_code", "read_file", "get_symbols", "get_diagnostics", "apply_patch", "run_command"],
  reviewer: ["read_file", "search_code", "get_diagnostics", "run_command"],
};
