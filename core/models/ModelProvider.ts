import { z } from "zod";

export const modelConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  apiKey: z.string().optional(),
});

export type ModelConfig = z.infer<typeof modelConfigSchema>;

export interface ModelToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type ModelMessage =
  | { role: "system" | "user" | "assistant"; content: string; toolCallId?: never; toolCalls?: ModelToolCall[] }
  | { role: "tool"; content: string; toolCallId: string; toolCalls?: never };

export interface ModelToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface ModelRequest {
  messages: ModelMessage[];
  tools?: ModelToolDefinition[];
  temperature?: number;
  signal?: AbortSignal;
}

export interface ModelResponse {
  content: string;
  toolCalls: ModelToolCall[];
  finishReason?: string;
}

export interface ModelStreamEvent {
  type: "text" | "done";
  text?: string;
}

export interface ModelProvider {
  chat(request: ModelRequest): Promise<ModelResponse>;
  stream?(request: ModelRequest): AsyncIterable<ModelStreamEvent>;
}
