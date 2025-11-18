import type { ZodTypeAny } from "zod";
import type { ModelToolDefinition } from "../models/ModelProvider";
import type { TraceRecorder } from "../trace/TraceRecorder";

export interface ToolContext {
  workspaceRoot: string;
  trace: TraceRecorder;
}

export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  schema: ZodTypeAny;
  jsonSchema: Record<string, unknown>;
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}

export function asModelTool(tool: AgentTool): ModelToolDefinition {
  return { name: tool.name, description: tool.description, parameters: tool.jsonSchema };
}
