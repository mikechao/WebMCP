import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/entrypoints/sidepanel/components/ui/select';
import { Input } from '@/entrypoints/sidepanel/components/ui/input';
import { Button } from '@/entrypoints/sidepanel/components/ui/button';
import { Label } from '@/entrypoints/sidepanel/components/ui/label';
import { useModelConfigStore, OPENAI_MODELS, ANTHROPIC_MODELS } from '../lib/modelConfig';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();

  // Use Zustand store for persistent config
  const { config, setConfig, setApiKey, resetConfig } = useModelConfigStore();

  const [showOpenai, setShowOpenai] = useState<boolean>(false);
  const [showAnthropic, setShowAnthropic] = useState<boolean>(false);

  function save() {
    // The Zustand store automatically persists changes, so no explicit save needed
    // Show feedback to user that settings were saved
    toast.success('Settings saved successfully!');
  }

  function handleProviderChange(newProvider: 'openai' | 'anthropic') {
    setConfig({ modelProvider: newProvider });
  }

  function handleOpenaiModelChange(modelName: string) {
    setConfig({ openaiModelName: modelName });
  }

  function handleAnthropicModelChange(modelName: string) {
    setConfig({ anthropicModelName: modelName });
  }

  function handleOpenaiKeyChange(apiKey: string) {
    if (config.modelProvider === 'openai') {
      setApiKey(apiKey || null);
    } else {
      setConfig({ openaiApiKey: apiKey || undefined });
    }
  }

  function handleAnthropicKeyChange(apiKey: string) {
    if (config.modelProvider === 'anthropic') {
      setApiKey(apiKey || null);
    } else {
      setConfig({ anthropicApiKey: apiKey || undefined });
    }
  }

  function reload() {
    // Reset to default configuration from environment
    resetConfig();
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => navigate({ to: '/chat' })}
          title="Close Settings"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4">
        <Label>Model Provider</Label>
        <Select value={config.modelProvider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.modelProvider === 'openai' ? (
        <div>
          <div className="mb-4">
            <Label>OpenAI Model</Label>
            <Select
              value={config.openaiModelName ?? 'gpt-4o'}
              onValueChange={handleOpenaiModelChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {OPENAI_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <Label>OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showOpenai ? 'text' : 'password'}
                value={config.openaiApiKey ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleOpenaiKeyChange(e.target.value)
                }
                placeholder="sk-..."
              />
              <Button variant="ghost" onClick={() => setShowOpenai((s) => !s)}>
                {showOpenai ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <Label>Anthropic Model</Label>
            <Select
              value={config.anthropicModelName ?? 'claude-sonnet-4-20250514'}
              onValueChange={handleAnthropicModelChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {ANTHROPIC_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <Label>Anthropic API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showAnthropic ? 'text' : 'password'}
                value={config.anthropicApiKey ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleAnthropicKeyChange(e.target.value)
                }
                placeholder="sk-ant-..."
              />
              <Button variant="ghost" onClick={() => setShowAnthropic((s) => !s)}>
                {showAnthropic ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={save}>Save</Button>
        <Button variant="ghost" onClick={reload}>
          Reload
        </Button>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/settings')({
  component: Settings,
});
