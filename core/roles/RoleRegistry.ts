import type { RoleBindings, RoleName } from "./Role";

export class RoleRegistry {
  constructor(private bindings: RoleBindings) {}

  bind(role: RoleName, modelId: string): void { this.bindings = { ...this.bindings, [role]: modelId }; }

  modelFor(role: RoleName): string {
    const id = this.bindings[role];
    if (!id) throw new Error(`No model is assigned to the ${role} role`);
    return id;
  }

  all(): RoleBindings { return { ...this.bindings }; }
}
