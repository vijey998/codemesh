import * as vscode from "vscode";
import { flowConfigSchema, type FlowConfig } from "../../../core/flow/Flow";
import { modelConfigSchema, type ModelConfig } from "../../../core/models/ModelProvider";
import { roleBindingsSchema, type RoleBindings } from "../../../core/roles/Role";
import type { PublicModelConfig, UiConfig } from "../../../core/bridge/messages";

const SECRET_PREFIX = "codemesh.apiKey.";

export class ConfigService {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async loadUi(): Promise<UiConfig> {
    const configuration = vscode.workspace.getConfiguration("codemesh");
    const models = configuration.get<Omit<ModelConfig, "apiKey">[]>("models", []);
    const publicModels: PublicModelConfig[] = await Promise.all(models.map(async (model) => ({ ...model, hasApiKey: Boolean(await this.secrets.get(`${SECRET_PREFIX}${model.id}`)) })));
    return {
      models: publicModels,
      roles: roleBindingsSchema.parse(configuration.get("roles", { explorer: "", coder: "", reviewer: "" })),
      validationCommand: configuration.get("validationCommand", "npm test"),
      maxReviewerLoops: configuration.get("maxReviewerLoops", 1),
    };
  }

  async loadRuntime(): Promise<{ models: ModelConfig[]; roles: RoleBindings; flow: FlowConfig }> {
    const ui = await this.loadUi();
    const models = await Promise.all(ui.models.map(async (model) => modelConfigSchema.parse({
      id: model.id, displayName: model.displayName, baseUrl: model.baseUrl, model: model.model,
      apiKey: await this.secrets.get(`${SECRET_PREFIX}${model.id}`),
    })));
    return { models, roles: ui.roles, flow: flowConfigSchema.parse({ maxReviewerLoops: ui.maxReviewerLoops, validationCommand: ui.validationCommand }) };
  }

  async save(config: UiConfig): Promise<void> {
    const configuration = vscode.workspace.getConfiguration("codemesh");
    const models = config.models.map(({ apiKey: _apiKey, hasApiKey: _hasApiKey, ...model }) => modelConfigSchema.omit({ apiKey: true }).parse(model));
    await configuration.update("models", models, vscode.ConfigurationTarget.Global);
    await configuration.update("roles", roleBindingsSchema.parse(config.roles), vscode.ConfigurationTarget.Global);
    const flow = flowConfigSchema.parse({ validationCommand: config.validationCommand, maxReviewerLoops: config.maxReviewerLoops });
    await configuration.update("validationCommand", flow.validationCommand, vscode.ConfigurationTarget.Global);
    await configuration.update("maxReviewerLoops", flow.maxReviewerLoops, vscode.ConfigurationTarget.Global);
    for (const model of config.models) {
      if (model.apiKey) await this.secrets.store(`${SECRET_PREFIX}${model.id}`, model.apiKey);
    }
  }
}
