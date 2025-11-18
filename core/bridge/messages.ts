import type { FlowResult } from "../flow/Flow";
import type { ModelConfig } from "../models/ModelProvider";
import type { RoleBindings } from "../roles/Role";
import type { TraceEvent } from "../trace/TraceEvent";

export interface PublicModelConfig extends Omit<ModelConfig, "apiKey"> { hasApiKey?: boolean; apiKey?: string }
export interface UiConfig { models: PublicModelConfig[]; roles: RoleBindings; validationCommand: string; maxReviewerLoops: number }

export type WebviewToHostMessage =
  | { type: "ready" }
  | { type: "runTask"; task: string }
  | { type: "saveConfig"; config: UiConfig }
  | { type: "testModel"; model: PublicModelConfig }
  | { type: "clearTrace" };

export type HostToWebviewMessage =
  | { type: "state"; config: UiConfig; trace: TraceEvent[] }
  | { type: "trace"; trace: TraceEvent[] }
  | { type: "running"; running: boolean }
  | { type: "runComplete"; result: FlowResult }
  | { type: "notice"; level: "info" | "error"; message: string };
