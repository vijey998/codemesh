import type { ModelMessage } from "../models/ModelProvider";
import type { ModelRegistry } from "../models/ModelRegistry";
import { ROLE_PROMPTS, ROLE_TOOLS, type RoleName } from "../roles/Role";
import type { RoleRegistry } from "../roles/RoleRegistry";
import type { ToolRegistry } from "../tools/ToolRegistry";
import type { TraceRecorder } from "../trace/TraceRecorder";
import type { ConversationManager } from "./ConversationManager";
import type { ContextManager } from "./ContextManager";

export class AgentRuntime {
  constructor(
    private readonly models: ModelRegistry,
    private readonly roles: RoleRegistry,
    private readonly tools: ToolRegistry,
    private readonly trace: TraceRecorder,
    private readonly conversation: ConversationManager,
    private readonly context: ContextManager,
    private readonly workspaceRoot: string,
  ) {}

  async run(role: RoleName, task: string, additionalContext = ""): Promise<string> {
    const provider = this.models.get(this.roles.modelFor(role));
    const toolNames = ROLE_TOOLS[role];
    const messages: ModelMessage[] = [
      { role: "system", content: `${ROLE_PROMPTS[role]}\n\n${this.context.systemContext()}` },
      { role: "user", content: `${task}${additionalContext ? `\n\n${additionalContext}` : ""}` },
    ];
    this.trace.record("model_start", `${capitalize(role)} started`, { role });

    for (let turn = 0; turn < 12; turn += 1) {
      const response = await provider.chat({ messages, tools: this.tools.definitions(toolNames), temperature: 0.1 });
      messages.push({ role: "assistant", content: response.content, toolCalls: response.toolCalls });
      if (!response.toolCalls.length) {
        this.conversation.set(role, messages);
        this.trace.record("model_end", `${capitalize(role)} completed`, { role });
        return response.content;
      }

      for (const call of response.toolCalls) {
        let content: string;
        try {
          const result = await this.tools.execute(call.name, call.arguments, { workspaceRoot: this.workspaceRoot, trace: this.trace });
          content = JSON.stringify(result);
        } catch (error) {
          content = JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
        }
        messages.push({ role: "tool", toolCallId: call.id, content });
      }
    }
    throw new Error(`${capitalize(role)} exceeded the 12-turn tool limit`);
  }
}

function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
