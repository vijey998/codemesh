import * as vscode from "vscode";
import { z } from "zod";
import type { AgentTool } from "../../../core/tools/Tool";
import { resolveWorkspacePath } from "../../../core/tools/pathSafety";

const schema = z.object({ path: z.string().min(1) });
type Input = z.infer<typeof schema>;

export class DiagnosticsTool implements AgentTool<Input, Array<{ line: number; column: number; severity: string; message: string; source?: string }>> {
  name = "get_diagnostics";
  description = "Return current VS Code diagnostics for a workspace file.";
  schema = schema;
  jsonSchema = { type: "object", required: ["path"], properties: { path: { type: "string" } } };

  async execute(input: Input, context: { workspaceRoot: string }) {
    const uri = vscode.Uri.file(resolveWorkspacePath(context.workspaceRoot, input.path));
    return vscode.languages.getDiagnostics(uri).map((diagnostic) => ({
      line: diagnostic.range.start.line + 1,
      column: diagnostic.range.start.character + 1,
      severity: vscode.DiagnosticSeverity[diagnostic.severity].toLowerCase(),
      message: diagnostic.message,
      source: diagnostic.source,
    }));
  }
}
