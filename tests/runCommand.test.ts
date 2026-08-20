import { describe, expect, it } from "vitest";
import { splitCommand } from "../core/tools/RunCommandTool";

describe("splitCommand", () => {
  it("keeps quoted arguments together", () => expect(splitCommand('git commit -m "safe message"')).toEqual(["git", "commit", "-m", "safe message"]));
  it("rejects shell operators", () => expect(() => splitCommand("git status && echo unsafe")).toThrow("operators"));
  it("rejects unterminated quotes", () => expect(() => splitCommand('git log --format="oops')).toThrow("unterminated"));
});
