import * as vscode from "vscode";
import { z } from "zod";
import type { AgentTool } from "../../../core/tools/Tool";
import { resolveWorkspacePath } from "../../../core/tools/pathSafety";

const schema = z.object({ path: z.string().min(1) });
type Input = z.infer<typeof schema>;

export class SymbolsTool implements AgentTool<Input, Array<{ name: string; kind: string; line: number; children: string[] }>> {
  name = "get_symbols";
  description = "Return document symbols for a workspace file using VS Code language services.";
  schema = schema;
  jsonSchema = { type: "object", required: ["path"], properties: { path: { type: "string" } } };

  async execute(input: Input, context: { workspaceRoot: string }) {
    const uri = vscode.Uri.file(resolveWorkspacePath(context.workspaceRoot, input.path));
    await vscode.workspace.openTextDocument(uri);
    const symbols = await vscode.commands.executeCommand<Array<vscode.DocumentSymbol | vscode.SymbolInformation>>("vscode.executeDocumentSymbolProvider", uri) ?? [];
    return symbols.map((symbol) => {
      const documentSymbol = symbol as vscode.DocumentSymbol;
      const range = "selectionRange" in documentSymbol ? documentSymbol.selectionRange : (symbol as vscode.SymbolInformation).location.range;
      return {
        name: symbol.name,
        kind: vscode.SymbolKind[symbol.kind],
        line: range.start.line + 1,
        children: "children" in documentSymbol ? documentSymbol.children.map((child) => child.name) : [],
      };
    });
  }
}
