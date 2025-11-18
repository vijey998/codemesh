import type { AgentTool, ToolContext } from "./Tool";
import { asModelTool } from "./Tool";

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) throw new Error(`Tool '${tool.name}' is already registered`);
    this.tools.set(tool.name, tool);
  }

  select(names: string[]): AgentTool[] {
    return names.map((name) => {
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Tool '${name}' is not registered`);
      return tool;
    });
  }

  definitions(names: string[]) { return this.select(names).map(asModelTool); }

  async execute(name: string, input: unknown, context: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool '${name}'`);
    const parsed = tool.schema.parse(input);
    context.trace.record("tool_start", `Running ${name}`, { tool: name });
    try {
      const result = await tool.execute(parsed, context);
      context.trace.record("tool_end", `Completed ${name}`, { tool: name });
      return result;
    } catch (error) {
      context.trace.record("error", `${name}: ${error instanceof Error ? error.message : String(error)}`, { tool: name });
      throw error;
    }
  }
}
