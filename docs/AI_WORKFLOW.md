# AI-native development plan

## Objective

CodeMesh makes a coding-agent workflow inspectable: separate Explorer, Coder, and Reviewer roles share typed tools, while edits require an explicit IDE diff approval. The system is designed to make model choice, tool calls, and review outcomes visible.

## Current implementation

`core/` owns provider adapters, role execution, flow control, and traces. `extension/` owns VS Code integration, workspace access, and command boundaries. `webview/` presents chat, model settings, flows, and traces. The architecture and a reproducible demo are documented in `architecture.md` and `demo.md`.

## Verification and evaluation plan

Run the build and unit tests before packaging. In the demo project, record task success, tests before and after the patch, reviewer disposition, revision count, model calls, latency, and cost. Compare the multi-role flow with a single-model baseline on the same fixed tasks. A polished trace or a successful demo does not establish a general improvement without that evaluation.

## AI use and human control

Models can explore, propose patches, and review work. The user approves structured diffs. Tool schemas, workspace boundaries, command allowlists, tests, and traces provide checks independent of model prose. Future work includes streaming, fallback, richer patch staging, and a published task-level evaluation.
