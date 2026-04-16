import * as vscode from "vscode";
import { AgentRuntime } from "../../core/agent/AgentRuntime";
import { ContextManager } from "../../core/agent/ContextManager";
import { ConversationManager } from "../../core/agent/ConversationManager";
import type { WebviewToHostMessage } from "../../core/bridge/messages";
import { FlowExecutor } from "../../core/flow/FlowExecutor";
import { ModelRegistry } from "../../core/models/ModelRegistry";
import { OpenAICompatibleProvider } from "../../core/models/OpenAICompatibleProvider";
import { RoleRegistry } from "../../core/roles/RoleRegistry";
import { ReadFileTool } from "../../core/tools/ReadFileTool";
import { RunCommandTool } from "../../core/tools/RunCommandTool";
import { SearchCodeTool } from "../../core/tools/SearchCodeTool";
import { ToolRegistry } from "../../core/tools/ToolRegistry";
import { TraceRecorder } from "../../core/trace/TraceRecorder";
import { ConfigService } from "./config/ConfigService";
import { CodemeshViewProvider } from "./webview/CodemeshViewProvider";
import { ApplyPatchTool } from "./vscode/ApplyPatchTool";
import { DiagnosticsTool } from "./vscode/DiagnosticsTool";
import { SymbolsTool } from "./vscode/SymbolsTool";

export function activate(context: vscode.ExtensionContext): void {
  const trace = new TraceRecorder();
  const config = new ConfigService(context.secrets);
  const view = new CodemeshViewProvider(context.extensionUri);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(CodemeshViewProvider.viewType, view));
  context.subscriptions.push(vscode.commands.registerCommand("codemesh.open", () => vscode.commands.executeCommand("workbench.view.extension.codemesh")));
  context.subscriptions.push(vscode.commands.registerCommand("codemesh.clearTrace", () => trace.clear()));
  trace.subscribe((events) => { void view.post({ type: "trace", trace: events }); });

  let running = false;
  view.setMessageHandler(async (message) => {
    try {
      if (message.type === "ready") {
        await view.post({ type: "state", config: await config.loadUi(), trace: trace.all() });
      } else if (message.type === "saveConfig") {
        await config.save(message.config);
        await view.post({ type: "state", config: await config.loadUi(), trace: trace.all() });
        await view.post({ type: "notice", level: "info", message: "Model and role configuration saved." });
      } else if (message.type === "clearTrace") {
        trace.clear();
      } else if (message.type === "testModel") {
        const provider = new OpenAICompatibleProvider({ ...message.model, apiKey: message.model.apiKey });
        const result = await provider.chat({ messages: [{ role: "user", content: "Reply with exactly: CodeMesh connected" }], temperature: 0 });
        await view.post({ type: "notice", level: "info", message: result.content || "Connection succeeded." });
      } else if (message.type === "runTask") {
        if (running) throw new Error("A CodeMesh run is already in progress");
        running = true;
        await view.post({ type: "running", running: true });
        trace.clear();
        const result = await executeFlow(message, config, trace);
        await view.post({ type: "runComplete", result });
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      trace.record("error", messageText);
      await view.post({ type: "notice", level: "error", message: messageText });
    } finally {
      if (message.type === "runTask") { running = false; await view.post({ type: "running", running: false }); }
    }
  });
}

async function executeFlow(message: Extract<WebviewToHostMessage, { type: "runTask" }>, configService: ConfigService, trace: TraceRecorder) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) throw new Error("Open a workspace folder before running CodeMesh");
  const configured = await configService.loadRuntime();
  if (!configured.models.length) throw new Error("Configure at least one model in the Models tab");

  const models = new ModelRegistry((model) => new OpenAICompatibleProvider(model));
  models.replace(configured.models);
  const roles = new RoleRegistry(configured.roles);
  const tools = new ToolRegistry();
  tools.register(new SearchCodeTool());
  tools.register(new ReadFileTool());
  tools.register(new SymbolsTool());
  tools.register(new DiagnosticsTool());
  tools.register(new ApplyPatchTool());
  tools.register(new RunCommandTool());

  const runtime = new AgentRuntime(models, roles, tools, trace, new ConversationManager(), new ContextManager({ name: folder.name, root: folder.uri.fsPath }), folder.uri.fsPath);
  return new FlowExecutor(runtime, trace).execute(message.task, configured.flow);
}

export function deactivate(): void {}
