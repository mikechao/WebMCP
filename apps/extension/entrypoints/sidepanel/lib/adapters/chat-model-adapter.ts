import type { 
  ChatModelAdapter, 
  ChatModelRunOptions, 
  ChatModelRunResult,
  ThreadMessage 
} from '@assistant-ui/react';

/**
 * Custom ChatModelAdapter that maintains backend streaming and tool forwarding
 * while working with LocalRuntime
 */
export class StreamingChatModelAdapter implements ChatModelAdapter {
  private apiUrl: string;

  constructor(apiUrl: string = 'http://localhost:8787/api/chat') {
    this.apiUrl = apiUrl;
  }

  async *run({ messages, abortSignal, context }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult> {
    try {
      // Convert assistant-ui messages to the format expected by your backend
      const formattedMessages = this.formatMessagesForBackend(messages);

      console.log('[ChatAdapter] Original messages:', messages);
      console.log('[ChatAdapter] Formatted messages:', formattedMessages);
      console.log('[ChatAdapter] Context object:', context);

      const requestBody = {
        messages: formattedMessages,
        // Forward any tools from context if needed
        tools: context?.tools || [],
        // Include system from context if present
        system: context?.system,
        // Don't spread the entire context as it might override messages
      };

      console.log('[ChatAdapter] Full request body:', JSON.stringify(requestBody, null, 2));

      // Make the streaming request to your backend
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === '') continue;

            try {
              // Handle Server-Sent Events format
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  return;
                }

                const parsed = JSON.parse(data);
                
                // Handle different response formats from your backend
                if (parsed.choices?.[0]?.delta?.content) {
                  // OpenAI-style streaming format
                  currentContent += parsed.choices[0].delta.content;
                } else if (parsed.content) {
                  // Simple content format
                  currentContent += parsed.content;
                } else if (parsed.delta) {
                  // Custom delta format
                  currentContent += parsed.delta;
                }

                // Yield the current state
                yield {
                  content: [{ type: 'text', text: currentContent }],
                };
              } else {
                // Handle non-SSE JSON lines
                const parsed = JSON.parse(line);
                
                if (parsed.content) {
                  currentContent += parsed.content;
                  yield {
                    content: [{ type: 'text', text: currentContent }],
                  };
                }
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('Failed to parse streaming response line:', line, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled - this is normal
        return;
      }
      
      console.error('ChatModelAdapter error:', error);
      throw error;
    }
  }

  /**
   * Convert assistant-ui ThreadMessage format to your backend's expected format
   */
  private formatMessagesForBackend(messages: readonly ThreadMessage[]): any[] {
    return messages.map(message => {
      // Handle different content types
      let content: string;
      
      if (typeof message.content === 'string') {
        content = message.content;
      } else if (Array.isArray(message.content)) {
        // Extract text content from message parts
        content = message.content
          .filter(part => part.type === 'text')
          .map(part => (part as any).text)
          .join('\n');
      } else {
        content = String(message.content);
      }

      // Return only the fields that AI SDK expects
      return {
        role: message.role,
        content,
        // Don't include id, createdAt, or other extra fields that AI SDK doesn't expect
      };
    });
  }

  /**
   * Handle tool calls if your backend supports them
   */
  private async handleToolCall(toolCall: any, abortSignal: AbortSignal): Promise<any> {
    // Implement tool call handling if needed
    // This would forward tool calls to your MCP client
    return {
      toolCallId: toolCall.id,
      result: 'Tool call not implemented',
    };
  }
}

/**
 * Factory function to create the adapter with custom configuration
 */
export function createStreamingChatAdapter(config?: {
  apiUrl?: string;
  customHeaders?: Record<string, string>;
  timeout?: number;
}): ChatModelAdapter {
  return new StreamingChatModelAdapter(config?.apiUrl);
}

export default StreamingChatModelAdapter;
