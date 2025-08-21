// Export all adapters
export { StreamingChatModelAdapter, createStreamingChatAdapter } from './chat-model-adapter';
export { IndexedDBThreadListAdapter, createIndexedDBThreadListAdapter } from './thread-list-adapter';
export { IndexedDBHistoryAdapter, createIndexedDBHistoryAdapter } from './history-adapter';

// Export types
export type { unstable_RemoteThreadListAdapter as RemoteThreadListAdapter } from '@assistant-ui/react';
