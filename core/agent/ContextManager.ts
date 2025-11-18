export interface WorkspaceContext { name: string; root: string; files?: string[] }

export class ContextManager {
  constructor(private readonly workspace: WorkspaceContext) {}
  systemContext(): string { return `Workspace: ${this.workspace.name}\nRoot: ${this.workspace.root}\nUse workspace-relative paths for every tool.`; }
}
