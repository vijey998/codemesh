import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { AgentTool } from "./Tool";
import { resolveWorkspacePath } from "./pathSafety";

const schema = z.object({ path: z.string().min(1), startLine: z.number().int().min(1).default(1), endLine: z.number().int().min(1).optional() });
type Input = z.infer<typeof schema>;

export class ReadFileTool implements AgentTool<Input, { path: string; startLine: number; endLine: number; content: string }> {
  name = "read_file";
  description = "Read up to 400 lines from a workspace-relative text file.";
  schema = schema;
  jsonSchema = { type: "object", required: ["path"], properties: { path: { type: "string" }, startLine: { type: "number", minimum: 1 }, endLine: { type: "number", minimum: 1 } } };

  async execute(input: Input, context: { workspaceRoot: string }) {
    const absolutePath = resolveWorkspacePath(context.workspaceRoot, input.path);
    const content = await readFile(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);
    const endLine = Math.min(input.endLine ?? input.startLine + 399, input.startLine + 399, lines.length);
    if (endLine < input.startLine) throw new Error("endLine must not precede startLine");
    return { path: input.path, startLine: input.startLine, endLine, content: lines.slice(input.startLine - 1, endLine).join("\n") };
  }
}
