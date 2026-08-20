import { describe, expect, it } from "vitest";
import { parseSearchOutput } from "../core/tools/SearchCodeTool";

describe("parseSearchOutput", () => {
  it("normalizes ripgrep matches", () => {
    expect(parseSearchOutput("src\\agent.ts:12:class AgentRuntime {}\nREADME.md:3:Agent runtime\n")).toEqual([
      { path: "src/agent.ts", line: 12, text: "class AgentRuntime {}" },
      { path: "README.md", line: 3, text: "Agent runtime" },
    ]);
  });
});
