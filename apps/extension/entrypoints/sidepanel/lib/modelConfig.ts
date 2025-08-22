import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ModelConfig = {
  modelProvider: 'openai' | 'anthropic';
  openaiModelName?: OpenAIModelNames;
  openaiApiKey?: string;
  anthropicModelName?: AnthropicModelNames;
  anthropicApiKey?: string;
};

type ModelConfigStore = {
  config: ModelConfig;
  setConfig: (partial: Partial<ModelConfig>) => void;
  resetConfig: () => void;
  setApiKey: (key?: string | null) => void;
};

// Available OpenAI models for the UI dropdown
export const OPENAI_MODELS = [
  'gpt-5',
  'gpt-5-2025-08-07',
  'gpt-5-mini',
  'gpt-5-mini-2025-08-07',
  'gpt-5-nano',
  'gpt-5-nano-2025-08-07',
  'gpt-5-chat-latest',
  'gpt-4.1',
  'gpt-4.1-2025-04-14',
  'gpt-4.1-mini',
  'gpt-4.1-mini-2025-04-14',
  'gpt-4.1-nano',
  'gpt-4.1-nano-2025-04-14',
  'gpt-4o',
  'gpt-4o-2024-11-20',
  'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18',
  'gpt-4-turbo',
  'gpt-4-turbo-2024-04-09',
  'gpt-4',
  'chatgpt-4o-latest',
] as const;

export type OpenAIModelNames = (typeof OPENAI_MODELS)[number] | (string & {});

// Available Anthropic models for the UI dropdown
export const ANTHROPIC_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-latest',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-latest',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
] as const;

export type AnthropicModelNames = (typeof ANTHROPIC_MODELS)[number] | (string & {});

const baseDefaults = {
  modelProvider: 'openai' as 'openai' | 'anthropic',
  openaiModelName: 'gpt-4o-mini',
  openaiApiKey: undefined,
  anthropicModelName: undefined,
  anthropicApiKey: undefined,
};

const envModelConfig: ModelConfig = {
  ...baseDefaults,
  modelProvider: ((): 'openai' | 'anthropic' => {
    const provider = import.meta.env.VITE_MODEL_PROVIDER as string;
    if (provider === 'openai' || provider === 'anthropic') {
      return provider;
    }
    return baseDefaults.modelProvider; // Fallback to default if invalid
  })(),
  openaiModelName:
    (import.meta.env.VITE_OPENAI_MODEL_NAME as string) ?? baseDefaults.openaiModelName,
  openaiApiKey: (import.meta.env.VITE_OPENAI_API_KEY as string) ?? baseDefaults.openaiApiKey,
  anthropicModelName:
    (import.meta.env.VITE_ANTHROPIC_MODEL_NAME as string) ?? baseDefaults.anthropicModelName,
  anthropicApiKey:
    (import.meta.env.VITE_ANTHROPIC_API_KEY as string) ?? baseDefaults.anthropicApiKey,
};

const defaultModelConfig: ModelConfig = import.meta.env.DEV ? envModelConfig : baseDefaults;

/**
 * A small zustand store that persists the effective ModelConfig to localStorage.
 * It uses the same defaults defined by `defaultModelConfig` and stores under
 * the key `webmcp.extension.modelconfig.v1`.
 */
export const useModelConfigStore = create<ModelConfigStore>()(
  persist<ModelConfigStore>(
    (set, get) => ({
      config: { ...defaultModelConfig },
      setConfig: (partial: Partial<ModelConfig>) =>
        set((state: ModelConfigStore) => ({ config: { ...state.config, ...partial } })),
      resetConfig: () => set({ config: { ...defaultModelConfig } }),
      setApiKey: (key?: string | null) => {
        if (key == null) {
          const getter = get as () => ModelConfigStore;
          const cur = { ...getter().config };
          if (cur.modelProvider === 'anthropic') {
            delete cur.anthropicApiKey;
          } else {
            delete cur.openaiApiKey;
          }
          set({ config: cur });
          return;
        }

        const getter = get as () => ModelConfigStore;
        const provider = getter().config.modelProvider;
        if (provider === 'anthropic') {
          set((s: ModelConfigStore) => ({ config: { ...s.config, anthropicApiKey: key } }));
        } else {
          set((s: ModelConfigStore) => ({ config: { ...s.config, openaiApiKey: key } }));
        }
      },
    }),
    {
      name: 'webmcp.extension.modelconfig.v1',
      // zustand persist typings expect a `storage` with async getItem/setItem/removeItem
      storage: {
        getItem: (name: string) =>
          Promise.resolve(JSON.parse(localStorage.getItem(name) ?? 'null')),
        setItem: (name: string, value: unknown) => {
          localStorage.setItem(name, JSON.stringify(value));
          return Promise.resolve();
        },
        removeItem: (name: string) => {
          localStorage.removeItem(name);
          return Promise.resolve();
        },
      } as any,
    }
  )
);
