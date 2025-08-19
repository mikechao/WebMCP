import {
  BookmarksApiTools,
  type BookmarksApiToolsOptions,
  HistoryApiTools,
  type HistoryApiToolsOptions,
  ScriptingApiTools,
  type ScriptingApiToolsOptions,
  StorageApiTools,
  type StorageApiToolsOptions,
  TabGroupsApiTools,
  type TabGroupsApiToolsOptions,
  TabsApiTools,
  type TabsApiToolsOptions,
  WindowsApiTools,
  type WindowsApiToolsOptions,
} from '@mcp-b/extension-tools';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { UserScriptTools, UserScriptToolsOptions } from '../models/aiCRUD/UserScriptTools';
import { ToolCallTracker } from './ToolCallTracker';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CallContext } from '../types/tracking';

// I know this seems unMaintainable but having all the sub methods redefined is eaiser for AI
export interface ExtensionToolsOptions {
  bookmarks?: BookmarksApiToolsOptions;
  history?: HistoryApiToolsOptions;
  storage?: StorageApiToolsOptions;
  tabs?: TabsApiToolsOptions;
  windows?: WindowsApiToolsOptions;
  scripting?: ScriptingApiToolsOptions;
  tabGroups?: TabGroupsApiToolsOptions;
  userScriptTools?: UserScriptToolsOptions;
}

/**
 * Service that registers extension-specific tools with the MCP server.
 * These tools provide access to Chrome Extension APIs available in the background service worker.
 */
export class ExtensionToolsService {
  private apiTools: any[] = [];

  constructor(
    private server: McpServer,
    private options: ExtensionToolsOptions = {},
    private toolCallTracker: ToolCallTracker
  ) {
    this.initializeApiTools();
  }

  private initializeApiTools(): void {
    // Initialize all API tool classes with a custom server wrapper
    const registerToolWithTracking = (
      name: string,
      config: any,
      handler: (args: any, extra?: any) => Promise<CallToolResult>
    ) => {
      const apiType = this.extractApiTypeFromToolName(name);
      return this.toolCallTracker.registerTool(this.server, name, config, handler, (toolName) =>
        this.buildExtensionCallContext(toolName, apiType)
      );
    };

    // Create a proxy server that uses our tracking registration
    const trackedServer = new Proxy(this.server, {
      get: (target, prop, receiver) => {
        if (prop === 'registerTool') {
          return registerToolWithTracking;
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as McpServer;

    this.apiTools = [
      new BookmarksApiTools(trackedServer, this.options.bookmarks),
      new StorageApiTools(trackedServer, this.options.storage),
      new HistoryApiTools(trackedServer, this.options.history),
      new TabGroupsApiTools(trackedServer, this.options.tabGroups),
      new TabsApiTools(trackedServer, this.options.tabs),
      new UserScriptTools(trackedServer, this.options.userScriptTools),
      new WindowsApiTools(trackedServer, this.options.windows),
      new ScriptingApiTools(trackedServer, this.options.scripting),
    ];
  }

  /**
   * Get a summary of available Chrome APIs
   */
  getAvailableApis(): Record<string, any> {
    const apiStatuses: Record<string, any> = {};

    for (const tool of this.apiTools) {
      const availability = tool.checkAvailability();
      apiStatuses[tool.apiName.toLowerCase()] = {
        available: availability.available,
        message: availability.message,
        details: availability.details,
      };
    }

    return apiStatuses;
  }

  /**
   * Register all extension-specific tools with the MCP server
   * Only registers tools for APIs that are available (have proper permissions)
   */
  registerAllTools() {
    console.log('Registering extension tools...');

    // Always register the API check tool
    this.registerApiCheckTool();

    // Register all API tools
    for (const tool of this.apiTools) {
      tool.register();
    }
  }

  private registerApiCheckTool() {
    // Check available Chrome APIs
    this.server.registerTool(
      'extension_tool_check_available_apis',
      {
        description: 'Check which Chrome Extension APIs are available to the extension',
        inputSchema: {},
      },
      async () => {
        const apis = this.getAvailableApis();
        let permissions = null;

        // Only try to get permissions if the API is available
        if (chrome.permissions && typeof chrome.permissions.getAll === 'function') {
          try {
            permissions = await chrome.permissions.getAll();
          } catch (error) {
            console.error('Failed to get permissions:', error);
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  availableApis: apis,
                  permissions: permissions
                    ? {
                        permissions: permissions.permissions || [],
                        origins: permissions.origins || [],
                      }
                    : 'Permissions API not available',
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  }

  /**
   * Extract API type from tool name for better context
   */
  private extractApiTypeFromToolName(toolName: string): string {
    // Tool names follow pattern: extension_tool_{api}_{operation}
    // e.g., extension_tool_create_bookmark -> bookmarks
    // e.g., extension_tool_list_active_tabs -> tabs
    const match = toolName.match(
      /^extension_tool_(?:(?:get|list|create|update|delete|remove|search|move|close|reload|capture|detect|discard|duplicate|group|ungroup|highlight|send)_)?(.+?)(?:_tab|_tabs|_bookmark|_bookmarks|_window|_windows|_group|_groups|_history|_storage)?$/
    );

    if (match) {
      const extracted = match[1];
      // Map common patterns to API types
      if (extracted.includes('bookmark')) return 'bookmarks';
      if (extracted.includes('tab')) return 'tabs';
      if (extracted.includes('window')) return 'windows';
      if (extracted.includes('group')) return 'tabGroups';
      if (extracted.includes('history')) return 'history';
      if (extracted.includes('storage')) return 'storage';
      return extracted;
    }

    return 'unknown';
  }

  private buildExtensionCallContext(toolName: string, apiType?: string): CallContext {
    return this.toolCallTracker.createBaseContext({
      extensionId: chrome.runtime.id,
      toolSource: 'extension',
      clientName: 'chrome-extension',
      domain: apiType ? `extension-api-${apiType}` : 'extension-api',
      // Extension tools don't have tabId, but we can identify the API type
      toolOrigin: `chrome-extension://${chrome.runtime.id}/${apiType || 'unknown'}`,
      isActiveTab: false, // Extension tools don't relate to active tabs
    });
  }
}
