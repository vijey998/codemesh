import type { ModelMessage } from "../models/ModelProvider";
import type { RoleName } from "../roles/Role";

export class ConversationManager {
  private readonly messages = new Map<RoleName, ModelMessage[]>();
  get(role: RoleName): ModelMessage[] { return [...(this.messages.get(role) ?? [])]; }
  set(role: RoleName, messages: ModelMessage[]): void { this.messages.set(role, [...messages]); }
  clear(): void { this.messages.clear(); }
}
