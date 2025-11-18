import type { ModelConfig, ModelProvider } from "./ModelProvider";

export type ProviderFactory = (config: ModelConfig) => ModelProvider;

export class ModelRegistry {
  private readonly configs = new Map<string, ModelConfig>();
  private readonly providers = new Map<string, ModelProvider>();

  constructor(private readonly factory: ProviderFactory) {}

  register(config: ModelConfig): void {
    this.configs.set(config.id, config);
    this.providers.delete(config.id);
  }

  replace(configs: ModelConfig[]): void {
    this.configs.clear();
    this.providers.clear();
    configs.forEach((config) => this.configs.set(config.id, config));
  }

  get(id: string): ModelProvider {
    const config = this.configs.get(id);
    if (!config) throw new Error(`Model '${id}' is not configured`);
    const existing = this.providers.get(id);
    if (existing) return existing;
    const provider = this.factory(config);
    this.providers.set(id, provider);
    return provider;
  }

  list(): ModelConfig[] { return [...this.configs.values()]; }
}
