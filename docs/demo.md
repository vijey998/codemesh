# Demo guide

1. Run `npm install`, then `npm run package` at the repository root.
2. Install the generated `codemesh-0.1.0.vsix` in VS Code or Cursor.
3. Open `examples/demo-project` and start the CodeMesh sidebar.
4. Add an OpenAI-compatible endpoint in **Models** and assign it to all three roles.
5. Use the task from the demo project's README.
6. Approve the Coder's diff, then watch the Reviewer and trace.

For local servers, the default URL shape is `http://localhost:8000/v1`; CodeMesh calls `/chat/completions` and uses standard function/tool calling.
