import { openai } from '@ai-sdk/openai';
import { zValidator } from '@hono/zod-validator';
import { convertToModelMessages, streamText } from 'ai';

import { frontendTools } from '@assistant-ui/react-ai-sdk';
import { Env, Hono } from 'hono';
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

export const maxDuration = 30;

/**
 * Chat route handler
 * Handles AI chat functionality using OpenAI models
 */
const chat = new Hono<{ Bindings: Env }>().post(
  '/chat',
  zValidator('json', PostRequestBodySchema),
  async (c) => {
    const { messages, system, tools } = c.req.valid('json');

    const result = streamText({
      model: openai('gpt-4o-mini'),

      system,
      messages: convertToModelMessages(messages),
      tools: {
        ...frontendTools(tools),
      },
    });

    return result.toUIMessageStreamResponse();
  }
);

export default chat;
