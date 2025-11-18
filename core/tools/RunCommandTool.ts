import { spawn } from "node:child_process";
import { z } from "zod";
import type { AgentTool, ToolContext } from "./Tool";

const schema = z.object({ command: z.string().min(1).max(500), timeoutMs: z.number().int().min(1000).max(120_000).default(60_000) });
type Input = z.infer<typeof schema>;
const ALLOWED = new Set(["npm", "npm.cmd", "pnpm", "pnpm.cmd", "yarn", "bun", "npx", "npx.cmd", "git", "pytest", "python", "python3", "dotnet", "cargo", "go", "make"]);

export class RunCommandTool implements AgentTool<Input, { exitCode: number | null; timedOut: boolean; output: string }> {
  name = "run_command";
  description = "Run an approved development command inside the workspace with a timeout and bounded output.";
  schema = schema;
  jsonSchema = { type: "object", required: ["command"], properties: { command: { type: "string" }, timeoutMs: { type: "number", minimum: 1000, maximum: 120000 } } };

  async execute(input: Input, context: ToolContext) {
    const [rawExecutable, ...args] = splitCommand(input.command);
    const executable = rawExecutable?.toLowerCase();
    if (!rawExecutable || !executable || !ALLOWED.has(executable)) throw new Error(`Command '${executable ?? ""}' is not allowed`);
    context.trace.record("command", input.command, { tool: this.name });
    return runCommand(rawExecutable, args, context.workspaceRoot, input.timeoutMs);
  }
}

function runCommand(executable: string, args: string[], cwd: string, timeoutMs: number): Promise<{ exitCode: number | null; timedOut: boolean; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, shell: false, windowsHide: true, env: process.env });
    let output = "";
    let timedOut = false;
    const append = (chunk: unknown) => { if (output.length < 100_000) output += String(chunk); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", reject);
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.on("close", (exitCode) => { clearTimeout(timer); resolve({ exitCode, timedOut, output: output.slice(0, 100_000) }); });
  });
}

export function splitCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  for (const character of command.trim()) {
    if (quote) {
      if (character === quote) quote = undefined;
      else current += character;
    } else if (character === "'" || character === '"') quote = character;
    else if (/\s/.test(character)) {
      if (current) { tokens.push(current); current = ""; }
    } else if (/[;&|<>]/.test(character)) throw new Error("Shell operators are not allowed");
    else current += character;
  }
  if (quote) throw new Error("Command contains an unterminated quote");
  if (current) tokens.push(current);
  return tokens;
}
