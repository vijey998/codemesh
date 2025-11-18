import type { RoleName } from "../roles/Role";

export interface ModelNode { id: string; type: "model"; role: RoleName; next?: string }
export interface ConditionNode { id: string; type: "condition"; condition: "approved"; whenTrue: string; whenFalse: string }
export type FlowNode = ModelNode | ConditionNode;
