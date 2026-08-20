import type { WebviewToHostMessage } from "../../core/bridge/messages";

interface VsCodeApi { postMessage(message: WebviewToHostMessage): void; getState(): unknown; setState(state: unknown): void }

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode = acquireVsCodeApi();
