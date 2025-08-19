import { CallContext, CallStatus, ToolCall } from '../types/tracking';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export class ToolCallTracker {
  private calls: Map<string, ToolCall> = new Map();
  private maxCalls: number = 1000;

  constructor() {}

  /**
   * Start tracking a new tool call
   */
  startCall(toolName: string, context: CallContext): string {
    const callId = this.generateCallId();
    const now = Date.now();

    const call: ToolCall = {
      id: callId,
      toolName,
      context,
      status: CallStatus.INITIATED,
      startTime: now,
    };

    this.calls.set(callId, call);
    this.enforceRetentionPolicy();

    return callId;
  }

  /**
   * Update call status to executing
   */
  updateCallExecuting(callId: string): void {
    const call = this.calls.get(callId);
    if (call) {
      const now = Date.now();
      call.status = CallStatus.EXECUTING;
      call.executingTime = now;
    }
  }

  /**
   * Complete a tool call successfully
   */
  completeCall(callId: string): void {
    const call = this.calls.get(callId);
    if (call) {
      const now = Date.now();
      call.status = CallStatus.COMPLETED;
      call.endTime = now;
      call.duration = now - call.startTime;

      this.publishToolCall(call);
      this.calls.delete(callId);
    }
  }

  /**
   * Mark a tool call as failed
   */
  failCall(callId: string, error: string): void {
    const call = this.calls.get(callId);
    if (call) {
      const now = Date.now();
      call.status = CallStatus.FAILED;
      call.endTime = now;
      call.duration = now - call.startTime;
      call.error = error;

      this.publishToolCall(call);
      this.calls.delete(callId);
    }
  }

  async publishToolCall(toolCall: ToolCall): Promise<void> {
    // For now print the full toolCall object so callers can inspect errors, context, and any payloads
    try {
      console.log('[ToolCallTracker] Full tool call:', JSON.stringify(toolCall, null, 2));
    } catch (e) {
      // Fallback if toolCall contains circular references
      console.log('[ToolCallTracker] Full tool call (non-serializable):', toolCall);
    }
  }

  async executeWithTracking<T extends CallToolResult = CallToolResult>(
    toolName: string,
    args: any,
    context: CallContext,
    handler: (args: any) => Promise<T>
  ): Promise<T> {
    const callId = this.startCall(toolName, context);

    try {
      // Mark call as executing
      this.updateCallExecuting(callId);

      // Execute the handler
      const result = await handler(args);
      if (result.isError) {
        const errorStr = this.createError(result);
        this.failCall(callId, errorStr);
      }
      // Mark call as completed
      this.completeCall(callId);

      return result;
    } catch (error) {
      // Mark call as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.failCall(callId, errorMessage);

      // Re-throw the error to maintain normal behavior
      throw error;
    }
  }

  private createError(result: CallToolResult): string {
    const content = result.content;
    let errorStr: string;
    // Build a readable error string from several possible shapes of `content`.
    if (typeof content === 'string') {
      errorStr = content;
    } else if (Array.isArray(content)) {
      // If content is an array, collect all `text` fields from items with type === 'text'
      const pieces: string[] = [];
      for (const item of content) {
        if (!item) continue;
        // If the item itself is a string, include it
        if (typeof item === 'string') {
          pieces.push(item);
          continue;
        }

        // Prefer explicit { type: 'text', text: '...' } shapes
        if (item.type === 'text' && typeof item.text === 'string') {
          pieces.push(item.text);
          continue;
        }

        // Fallback: include any `text` property if present
        if (typeof item.text === 'string') {
          pieces.push(item.text);
        }
      }

      if (pieces.length > 0) {
        errorStr = pieces.join(' ');
      } else {
        // Nothing textual found in array — fall back to JSON/stringify handling
        try {
          errorStr = JSON.stringify(content);
        } catch {
          errorStr = String(content ?? 'Unknown error');
        }
      }
    } else {
      // Non-string, non-array content — serialize if possible
      try {
        errorStr = JSON.stringify(content);
      } catch {
        errorStr = String(content ?? 'Unknown error');
      }
    }
    return errorStr;
  }

  createBaseContext(overrides: Partial<CallContext> = {}): CallContext {
    const baseContext: CallContext = {
      requestId: this.generateRequestId(),
      toolSource: 'extension',
      clientName: 'chrome-extension',
      ...overrides,
    };

    return baseContext;
  }

  /**
   * Register a tool with tracking context
   * @param server The MCP server to register the tool on
   * @param name The tool name
   * @param config The tool configuration
   * @param handler The tool handler function
   * @param contextBuilder Function that builds context for this specific tool
   */
  registerTool(
    server: McpServer,
    name: string,
    config: any,
    handler: (args: any, extra?: any) => Promise<CallToolResult>,
    contextBuilder: (toolName: string, args: any, extra?: any) => CallContext
  ) {
    // Wrap the handler with tracking context
    const wrappedHandler = async (args: any, extra?: any): Promise<CallToolResult> => {
      const context = contextBuilder(name, args, extra);
      return await this.executeWithTracking(name, args, context, () => handler(args, extra));
    };

    return server.registerTool(name, config, wrappedHandler);
  }

  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique call ID
   */
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Enforce retention policy by removing old calls
   */
  private enforceRetentionPolicy(): void {
    if (this.calls.size <= this.maxCalls) {
      return;
    }

    // Get calls sorted by start time (oldest first)
    const sortedCalls = Array.from(this.calls.values()).sort((a, b) => a.startTime - b.startTime);

    // Remove excess calls
    const toRemove = sortedCalls.slice(0, this.calls.size - this.maxCalls);
    toRemove.forEach((call) => {
      this.calls.delete(call.id);
    });

    console.log(
      `[ToolCallTracker] Removed ${toRemove.length} old calls to enforce retention policy`
    );
  }
}
