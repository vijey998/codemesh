import type { RoleName } from "../roles/Role";

export type TraceEventType = "model_start" | "model_end" | "tool_start" | "tool_end" | "file_edit" | "command" | "review" | "error";

export interface TraceEvent {
  id: string;
  timestamp: number;
  type: TraceEventType;
  role?: RoleName;
  tool?: string;
  summary: string;
}
