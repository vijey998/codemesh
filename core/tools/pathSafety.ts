import path from "node:path";

export function resolveWorkspacePath(workspaceRoot: string, candidate: string): string {
  if (!candidate || path.isAbsolute(candidate)) throw new Error("Path must be workspace-relative");
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, candidate);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Path escapes the workspace");
  return resolved;
}

export function relativeWorkspacePath(workspaceRoot: string, absolutePath: string): string {
  return path.relative(workspaceRoot, absolutePath).replaceAll("\\", "/");
}
