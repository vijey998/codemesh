import * as vscode from "vscode";
import { z } from "zod";
import type { AgentTool, ToolContext } from "../../../core/tools/Tool";
import { resolveWorkspacePath } from "../../../core/tools/pathSafety";

const editSchema = z.object({ startLine: z.number().int().min(1), endLine: z.number().int().min(0), replacement: z.string() });
const schema = z.object({ path: z.string().min(1), edits: z.array(editSchema).min(1).max(50) });
type Input = z.infer<typeof schema>;

export class ApplyPatchTool implements AgentTool<Input, { applied: boolean; path: string; editCount: number }> {
  name = "apply_patch";
  description = "Preview structured line edits in VS Code and apply them only after explicit user approval. Use endLine 0 for insertion before startLine.";
  schema = schema;
  jsonSchema = {
    type: "object",
    required: ["path", "edits"],
    properties: {
      path: { type: "string" },
      edits: { type: "array", items: { type: "object", required: ["startLine", "endLine", "replacement"], properties: { startLine: { type: "number" }, endLine: { type: "number" }, replacement: { type: "string" } } } },
    },
  };

  async execute(input: Input, context: ToolContext) {
    const uri = vscode.Uri.file(resolveWorkspacePath(context.workspaceRoot, input.path));
    const document = await vscode.workspace.openTextDocument(uri);
    const original = document.getText();
    const updated = applyLineEdits(original, input.edits);
    const preview = await vscode.workspace.openTextDocument({ content: updated, language: document.languageId });
    await vscode.commands.executeCommand("vscode.diff", uri, preview.uri, `CodeMesh Preview: ${input.path}`);
    const choice = await vscode.window.showWarningMessage(`Apply ${input.edits.length} CodeMesh edit(s) to ${input.path}?`, { modal: true }, "Apply");
    if (choice !== "Apply") return { applied: false, path: input.path, editCount: input.edits.length };

    const workspaceEdit = new vscode.WorkspaceEdit();
    const end = document.lineAt(document.lineCount - 1).rangeIncludingLineBreak.end;
    workspaceEdit.replace(uri, new vscode.Range(new vscode.Position(0, 0), end), updated);
    const applied = await vscode.workspace.applyEdit(workspaceEdit);
    if (applied) {
      await document.save();
      context.trace.record("file_edit", `Modified ${input.path}`, { tool: this.name });
    }
    return { applied, path: input.path, editCount: input.edits.length };
  }
}

export function applyLineEdits(content: string, edits: Input["edits"]): string {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const ordered = [...edits].sort((a, b) => b.startLine - a.startLine);
  let previousStart = Number.POSITIVE_INFINITY;
  for (const edit of ordered) {
    const isInsertion = edit.endLine === 0;
    const effectiveEnd = isInsertion ? edit.startLine - 1 : edit.endLine;
    if (!isInsertion && effectiveEnd < edit.startLine) throw new Error("endLine must be 0 or greater than or equal to startLine");
    if (effectiveEnd >= previousStart) throw new Error("Patch edits overlap");
    if (edit.startLine > lines.length + 1 || effectiveEnd > lines.length) throw new Error("Patch line is outside the document");
    const replacement = edit.replacement ? edit.replacement.split(/\r?\n/) : [];
    lines.splice(edit.startLine - 1, isInsertion ? 0 : effectiveEnd - edit.startLine + 1, ...replacement);
    previousStart = edit.startLine;
  }
  return lines.join(newline);
}
