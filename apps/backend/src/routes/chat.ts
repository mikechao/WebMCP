import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { zValidator } from '@hono/zod-validator';
import { streamText } from 'ai';

import { frontendTools } from '@assistant-ui/react-ai-sdk';
import { Context, Env, Hono } from 'hono';
import { z } from 'zod';
import '../../worker-configuration.d.ts';

/**
 * Request body schema for chat endpoint
 */
const PostRequestBodySchema = z.object({
  messages: z.array(z.any()),
  system: z.string().optional(),
  tools: z.any().optional(),
});

function getModel(c: Context<{ Bindings: Env }>) {
  // @ts-ignore
  if (c.env.MODEL_PROVIDER) {
    // @ts-ignore
    if (c.env.MODEL_PROVIDER === 'openai') {
      // @ts-ignore
      const modelName = c.env.OPENAI_MODEL_NAME ?? 'gpt-4o-mini';
      return openai(modelName);
    }
    // @ts-ignore
    if (c.env.MODEL_PROVIDER === 'anthropic') {
      // @ts-ignore
      return anthropic(c.env.ANTHROPIC_MODEL_NAME ?? 'claude-sonnet-4-20250514');
    }
  }
  // default fallback
  return anthropic('claude-sonnet-4-20250514');
}

/**
 * Chat route handler
 * Handles AI chat functionality using OpenAI models
 */
const chat = new Hono<{ Bindings: Env }>().post(
  '/chat',
  zValidator('json', PostRequestBodySchema),
  async (c) => {
    const { messages, system, tools } = c.req.valid('json');
    const newTools = frontendTools(tools);
    Object.keys(newTools).forEach((key) => {
      if (key.length > 60) {
        console.log(JSON.stringify({ key, tool: newTools[key] }, null, 3));
      }
    });

    const result = streamText({
      model: getModel(c),

      toolCallStreaming: true,
      system,
      messages,
      tools: {
        ...newTools,
      },
    });

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => {
        console.error('[Chat] Error:', error);
        return error instanceof Error ? error.message : 'Unknown error';
      },
    });
  }
);

export default chat;
