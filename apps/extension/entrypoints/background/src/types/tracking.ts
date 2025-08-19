export interface CallContext {
  // Existing fields
  tabId?: number;
  domain?: string;
  clientName?: string;
  sessionId?: string;
  requestId?: string;

  // New contextual fields
  extensionId?: string; // ID of the extension making the call
  toolSource: 'website' | 'extension' | 'cached';
  toolOrigin?: string; // Original URL where tool was registered
  isActiveTab?: boolean;
  dataId?: string; // Internal tracking ID (tab-123 or cached-456)
}

export enum CallStatus {
  INITIATED = 'initiated',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

export interface ToolCall {
  id: string;
  toolName: string;
  context: CallContext;
  status: CallStatus;
  startTime: number;
  executingTime?: number;
  endTime?: number;
  duration?: number;
  error?: string;
}
