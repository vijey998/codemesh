import * as vscode from "vscode";
import type { HostToWebviewMessage, WebviewToHostMessage } from "../../../core/bridge/messages";

export class CodemeshViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "codemesh.sidebar";
  private view?: vscode.WebviewView;
  private handler?: (message: WebviewToHostMessage) => Promise<void>;

  constructor(private readonly extensionUri: vscode.Uri) {}

  setMessageHandler(handler: (message: WebviewToHostMessage) => Promise<void>): void { this.handler = handler; }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist", "webview")] };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage(async (message: WebviewToHostMessage) => { await this.handler?.(message); });
  }

  post(message: HostToWebviewMessage): Thenable<boolean> | undefined { return this.view?.webview.postMessage(message); }
  reveal(): void { this.view?.show?.(true); }

  private html(webview: vscode.Webview): string {
    const nonce = randomNonce();
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "assets", "index.js"));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "assets", "index.css"));
    return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${style}"></head><body><div id="root"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
  }
}

function randomNonce(): string { return Array.from({ length: 24 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join(""); }
