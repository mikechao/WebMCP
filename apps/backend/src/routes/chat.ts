import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { zValidator } from '@hono/zod-validator';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';

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

/**
 * Expected headers for the chat endpoint. Keys are lower-cased because
 * HTTP header names are case-insensitive and libraries typically normalize
 * them to lower-case.
 */
const PostHeadersSchema = z.object({
  'x-api-key': z.string().nonempty(),
  'x-model-provider': z.enum(['openai', 'anthropic']),
  'x-model-name': z.string().nonempty(),
});

export const maxDuration = 30;

function getModel(headers: z.infer<typeof PostHeadersSchema>) {
  if (headers['x-model-provider'] === 'openai') {
    const provider = createOpenAI({
      apiKey: headers['x-api-key'],
    });
    return provider(headers['x-model-name']);
  }
  if (headers['x-model-provider'] === 'anthropic') {
    const provider = createAnthropic({
      apiKey: headers['x-api-key'],
    });
    return provider(headers['x-model-name']);
  }
  throw new Error(`Unsupported model provider: ${headers['x-model-provider']}`);
}

/**
 * Chat route handler
 * Handles AI chat functionality using OpenAI models
 */
const chat = new Hono<{ Bindings: Env }>().post(
  '/chat',
  // validate headers first so missing/invalid headers short-circuit the request
  zValidator('header', PostHeadersSchema),
  zValidator('json', PostRequestBodySchema),
  async (c) => {
    // typed header object from zValidator
    const headers = c.req.valid('header');
    const { messages, system, tools } = c.req.valid('json');

    const result = streamText({
      model: getModel(headers),

      system,
      messages: convertToModelMessages(messages),

      stopWhen: stepCountIs(100),
      tools: {
        ...frontendTools(tools),
      },
    });

    return result.toUIMessageStreamResponse();
  }
);

export default chat;
