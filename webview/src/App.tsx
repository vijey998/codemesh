import { useEffect, useMemo, useState } from "react";
import type { HostToWebviewMessage, PublicModelConfig, UiConfig } from "../../core/bridge/messages";
import type { FlowResult } from "../../core/flow/Flow";
import type { RoleName } from "../../core/roles/Role";
import type { TraceEvent } from "../../core/trace/TraceEvent";
import { vscode } from "./vscode";

type Tab = "chat" | "models" | "flow" | "trace";
const EMPTY_CONFIG: UiConfig = { models: [], roles: { explorer: "", coder: "", reviewer: "" }, validationCommand: "npm test", maxReviewerLoops: 1 };
const ROLES: RoleName[] = ["explorer", "coder", "reviewer"];

export function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [config, setConfig] = useState<UiConfig>(EMPTY_CONFIG);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState("");
  const [result, setResult] = useState<FlowResult>();
  const [notice, setNotice] = useState<{ level: "info" | "error"; message: string }>();

  useEffect(() => {
    const listener = (event: MessageEvent<HostToWebviewMessage>) => {
      const message = event.data;
      if (message.type === "state") { setConfig(message.config); setTrace(message.trace); }
      if (message.type === "trace") setTrace(message.trace);
      if (message.type === "running") setRunning(message.running);
      if (message.type === "runComplete") { setResult(message.result); setTab("chat"); }
      if (message.type === "notice") setNotice({ level: message.level, message: message.message });
    };
    window.addEventListener("message", listener);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", listener);
  }, []);

  const submit = () => {
    const value = task.trim();
    if (!value || running) return;
    setResult(undefined);
    setNotice(undefined);
    vscode.postMessage({ type: "runTask", task: value });
  };

  return <main>
    <header className="brand"><span className="brand-mark">◇</span><div><h1>CodeMesh</h1><p>Role-based coding agent</p></div><span className={`status-dot ${running ? "active" : ""}`} title={running ? "Running" : "Ready"} /></header>
    <nav>{(["chat", "models", "flow", "trace"] as Tab[]).map((name) => <button key={name} className={tab === name ? "selected" : ""} onClick={() => setTab(name)}>{capitalize(name)}{name === "trace" && trace.length ? <span className="count">{trace.length}</span> : null}</button>)}</nav>
    {notice ? <div className={`notice ${notice.level}`}>{notice.message}<button onClick={() => setNotice(undefined)}>×</button></div> : null}
    <section className="content">
      {tab === "chat" && <ChatTab task={task} setTask={setTask} submit={submit} running={running} trace={trace} result={result} />}
      {tab === "models" && <ModelsTab config={config} setConfig={setConfig} />}
      {tab === "flow" && <FlowTab config={config} setConfig={setConfig} />}
      {tab === "trace" && <TraceTab trace={trace} />}
    </section>
  </main>;
}

function ChatTab({ task, setTask, submit, running, trace, result }: { task: string; setTask: (value: string) => void; submit: () => void; running: boolean; trace: TraceEvent[]; result?: FlowResult }) {
  const grouped = useMemo(() => groupTrace(trace), [trace]);
  return <div className="chat-tab">
    <div className="conversation">
      {!trace.length && !result ? <div className="empty"><div className="mesh-icon">◇</div><h2>Build with a visible workflow</h2><p>Explorer gathers context, Coder implements, and Reviewer checks the result.</p></div> : null}
      {task && trace.length ? <article className="user-card"><span>You</span><p>{task}</p></article> : null}
      {Object.entries(grouped).map(([role, events]) => <article className="role-card" key={role}><div className="role-title"><span className={`role-icon ${role}`}>{role === "explorer" ? "⌕" : role === "coder" ? "⌘" : "✓"}</span>{capitalize(role)}</div>{events.map((event) => <div className="event" key={event.id}><span>{event.type === "error" ? "!" : event.type.endsWith("start") ? "○" : "✓"}</span>{event.summary}</div>)}</article>)}
      {result ? <article className={`result-card ${result.review.approved ? "approved" : "changes"}`}><strong>{result.review.approved ? "Review approved" : "Revision limit reached"}</strong><span>{result.revisions} revision{result.revisions === 1 ? "" : "s"}</span>{result.review.findings.map((finding) => <p key={finding.message}>{finding.severity}: {finding.message}</p>)}</article> : null}
    </div>
    <div className="composer"><textarea value={task} onChange={(event) => setTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit(); }} placeholder="Ask CodeMesh to change this repository…" rows={3} /><div><span>Ctrl+Enter to run</span><button className="primary" disabled={running || !task.trim()} onClick={submit}>{running ? "Running…" : "Run flow"}</button></div></div>
  </div>;
}

function ModelsTab({ config, setConfig }: { config: UiConfig; setConfig: (config: UiConfig) => void }) {
  const updateModel = (index: number, patch: Partial<PublicModelConfig>) => setConfig({ ...config, models: config.models.map((model, current) => current === index ? { ...model, ...patch } : model) });
  const removeModel = (index: number) => setConfig({ ...config, models: config.models.filter((_, current) => current !== index) });
  const addModel = () => setConfig({ ...config, models: [...config.models, { id: `model-${config.models.length + 1}`, displayName: "New Model", baseUrl: "http://localhost:8000/v1", model: "" }] });
  const save = () => vscode.postMessage({ type: "saveConfig", config });
  return <div>
    <div className="section-heading"><div><h2>Configured models</h2><p>Any OpenAI-compatible endpoint works.</p></div><button onClick={addModel}>+ Add</button></div>
    {!config.models.length ? <div className="empty small"><p>Add an endpoint to assign models to engineering roles.</p></div> : null}
    {config.models.map((model, index) => <div className="model-card" key={`${model.id}-${index}`}>
      <div className="model-card-title"><input aria-label="Display name" value={model.displayName} onChange={(event) => updateModel(index, { displayName: event.target.value })} /><button className="icon-button" title="Remove model" onClick={() => removeModel(index)}>×</button></div>
      <label>Identifier<input value={model.id} onChange={(event) => updateModel(index, { id: event.target.value })} /></label>
      <label>Base URL<input value={model.baseUrl} onChange={(event) => updateModel(index, { baseUrl: event.target.value })} /></label>
      <label>Model<input value={model.model} onChange={(event) => updateModel(index, { model: event.target.value })} /></label>
      <label>API key<input type="password" value={model.apiKey ?? ""} placeholder={model.hasApiKey ? "Stored securely — enter to replace" : "Optional for local endpoints"} onChange={(event) => updateModel(index, { apiKey: event.target.value })} /></label>
      <button onClick={() => vscode.postMessage({ type: "testModel", model })}>Test connection</button>
    </div>)}
    <div className="section-heading roles"><div><h2>Role assignment</h2><p>Flow logic stays independent from model choice.</p></div></div>
    <div className="role-bindings">{ROLES.map((role) => <label key={role}><span>{capitalize(role)}</span><select value={config.roles[role]} onChange={(event) => setConfig({ ...config, roles: { ...config.roles, [role]: event.target.value } })}><option value="">Select model…</option>{config.models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}</select></label>)}</div>
    <button className="primary wide" onClick={save}>Save configuration</button>
  </div>;
}

function FlowTab({ config, setConfig }: { config: UiConfig; setConfig: (config: UiConfig) => void }) {
  return <div><div className="section-heading"><div><h2>Default coding flow</h2><p>One bounded reviewer feedback loop.</p></div></div>
    <div className="flow"><FlowNode role="Explorer" model={displayModel(config, "explorer")} icon="⌕" /><Arrow /><FlowNode role="Coder" model={displayModel(config, "coder")} icon="⌘" /><Arrow /><FlowNode role="Reviewer" model={displayModel(config, "reviewer")} icon="✓" /><div className="decision">Approved?<span>yes → Done</span><span>no → Coder revision</span></div></div>
    <div className="flow-settings"><label>Reviewer loop limit<input type="number" min={0} max={3} value={config.maxReviewerLoops} onChange={(event) => setConfig({ ...config, maxReviewerLoops: Number(event.target.value) })} /></label><label>Validation command<input value={config.validationCommand} onChange={(event) => setConfig({ ...config, validationCommand: event.target.value })} /></label></div>
    <button className="primary wide" onClick={() => vscode.postMessage({ type: "saveConfig", config })}>Save flow</button>
  </div>;
}

function FlowNode({ role, model, icon }: { role: string; model: string; icon: string }) { return <div className="flow-node"><span>{icon}</span><div><strong>{role}</strong><small>{model}</small></div></div>; }
function Arrow() { return <div className="arrow">↓</div>; }

function TraceTab({ trace }: { trace: TraceEvent[] }) {
  return <div><div className="section-heading"><div><h2>Execution trace</h2><p>Every model, tool, command, review, and edit.</p></div><button onClick={() => vscode.postMessage({ type: "clearTrace" })}>Clear</button></div>
    <div className="timeline">{!trace.length ? <div className="empty small"><p>No execution events yet.</p></div> : trace.map((event) => <div className={`timeline-event ${event.type}`} key={event.id}><div className="timeline-dot" /><div><div><strong>{event.role ? capitalize(event.role) : event.tool ?? "Runtime"}</strong><time>{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div><p>{event.summary}</p><small>{event.type.replaceAll("_", " ")}</small></div></div>)}</div>
  </div>;
}

function groupTrace(trace: TraceEvent[]): Record<string, TraceEvent[]> {
  return trace.reduce<Record<string, TraceEvent[]>>((groups, event) => {
    const key = event.role ?? (event.type === "error" ? "runtime" : "tools");
    (groups[key] ??= []).push(event);
    return groups;
  }, {});
}
function displayModel(config: UiConfig, role: RoleName): string { return config.models.find((model) => model.id === config.roles[role])?.displayName ?? "Not assigned"; }
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
