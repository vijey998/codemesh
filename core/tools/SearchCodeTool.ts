import { spawn } from "node:child_process";
import { z } from "zod";
import type { AgentTool } from "./Tool";

const schema = z.object({ query: z.string().min(1).max(300), glob: z.string().max(100).optional(), maxResults: z.number().int().min(1).max(200).default(50) });
type Input = z.infer<typeof schema>;
export interface SearchMatch { path: string; line: number; text: string }

export class SearchCodeTool implements AgentTool<Input, SearchMatch[]> {
  name = "search_code";
  description = "Search workspace text with ripgrep and return matching paths, line numbers, and text.";
  schema = schema;
  jsonSchema = { type: "object", required: ["query"], properties: { query: { type: "string" }, glob: { type: "string" }, maxResults: { type: "number", minimum: 1, maximum: 200 } } };

  async execute(input: Input, context: { workspaceRoot: string }): Promise<SearchMatch[]> {
    const args = ["-n", "--no-heading", "--color", "never", "--max-count", String(input.maxResults), "--", input.query, "."];
    if (input.glob) args.unshift("-g", input.glob);
    const output = await runRg(args, context.workspaceRoot);
    return parseSearchOutput(output).slice(0, input.maxResults);
  }
}

function runRg(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("rg", args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { if (stdout.length < 200_000) stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { if (stderr.length < 20_000) stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 || code === 1 ? resolve(stdout) : reject(new Error(stderr || `rg exited with code ${code}`)));
  });
}

export function parseSearchOutput(output: string): SearchMatch[] {
  return output.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    const match = line.match(/^(.+?):(\d+):(.*)$/);
    return match ? [{ path: match[1]!.replaceAll("\\", "/"), line: Number(match[2]), text: match[3]!.trim() }] : [];
  });
}
