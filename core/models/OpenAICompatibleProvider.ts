import type { ModelConfig, ModelProvider, ModelRequest, ModelResponse } from "./ModelProvider";

interface OpenAIResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
      tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
    };
  }>;
  error?: { message?: string };
}

export class OpenAICompatibleProvider implements ModelProvider {
  constructor(private readonly config: ModelConfig) {}

  async chat(request: ModelRequest): Promise<ModelResponse> {
    const endpoint = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: request.messages.map((message) => {
          if (message.role === "tool") return { role: "tool", content: message.content, tool_call_id: message.toolCallId };
          return {
            role: message.role,
            content: message.content,
            ...(message.toolCalls?.length
              ? { tool_calls: message.toolCalls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: JSON.stringify(call.arguments) } })) }
              : {}),
          };
        }),
        tools: request.tools?.map((tool) => ({ type: "function", function: tool })),
        tool_choice: request.tools?.length ? "auto" : undefined,
        temperature: request.temperature ?? 0.1,
      }),
      signal: request.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;
    if (!response.ok) throw new Error(payload.error?.message ?? `Model request failed (${response.status})`);
    const choice = payload.choices?.[0];
    if (!choice?.message) throw new Error("Model response did not include a message");

    return {
      content: choice.message.content ?? "",
      finishReason: choice.finish_reason,
      toolCalls: (choice.message.tool_calls ?? []).map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: parseArguments(call.function.arguments),
      })),
    };
  }
}

function parseArguments(value: string): unknown {
  try { return JSON.parse(value); }
  catch { throw new Error("Model returned invalid tool arguments"); }
}
