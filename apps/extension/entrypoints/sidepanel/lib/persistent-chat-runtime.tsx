import { ReactNode, useMemo, useCallback } from 'react';
import {
  AssistantRuntimeProvider,
  useLocalThreadRuntime,
  unstable_useRemoteThreadListRuntime as useRemoteThreadListRuntime,
  useThreadListItem,
  RuntimeAdapterProvider,
  type ChatModelAdapter,
  type ThreadHistoryAdapter,
} from '@assistant-ui/react';
import { 
  createStreamingChatAdapter,
  createIndexedDBThreadListAdapter,
  createIndexedDBHistoryAdapter,
} from './adapters';
import { DatabaseManager } from './database-manager';

interface PersistentChatRuntimeProviderProps {
  children: ReactNode;
  apiUrl?: string;
}

/**
 * Runtime provider that combines LocalRuntime with IndexedDB persistence
 * and maintains compatibility with existing backend streaming and tool forwarding
 */
export function PersistentChatRuntimeProvider({ 
  children, 
  apiUrl = 'http://localhost:8787/api/chat' 
}: PersistentChatRuntimeProviderProps) {
  
  // Initialize database on mount
  useMemo(() => {
    DatabaseManager.initialize().catch(error => {
      console.error('Failed to initialize chat database:', error);
    });
  }, []);

  // Create the streaming chat adapter that maintains backend compatibility
  const chatAdapter = useMemo(() => createStreamingChatAdapter({ apiUrl }), [apiUrl]);

  // Create the thread list adapter for multi-thread support
  const threadListAdapter = useMemo(() => createIndexedDBThreadListAdapter(), []);

  // Create the main runtime using remote thread list with local thread runtime
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      // This creates a LocalRuntime for each thread
      return useLocalThreadRuntime(chatAdapter, {
        // Additional LocalRuntime options can go here
        maxSteps: 5, // Limit tool call chains
      });
    },
    adapter: {
      ...threadListAdapter,
      
      // Provider component that adds thread-specific adapters
      unstable_Provider: ({ children }) => {
        // This runs in the context of each thread
        const threadListItem = useThreadListItem();
        const remoteId = threadListItem?.remoteId;

        // Create thread-specific history adapter
        const historyAdapter = useMemo<ThreadHistoryAdapter | undefined>(() => {
          if (!remoteId) return undefined;
          return createIndexedDBHistoryAdapter(remoteId);
        }, [remoteId]);

        // Create adapters object for this thread
        const adapters = useMemo(() => {
          const adapterObj: any = {};
          
          if (historyAdapter) {
            adapterObj.history = historyAdapter;
          }

          // Add other adapters here as needed
          // adapterObj.attachments = createAttachmentAdapter();
          // adapterObj.speech = createSpeechAdapter();
          // adapterObj.feedback = createFeedbackAdapter();

          return adapterObj;
        }, [historyAdapter]);

        return (
          <RuntimeAdapterProvider adapters={adapters}>
            {children}
          </RuntimeAdapterProvider>
        );
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

export default PersistentChatRuntimeProvider;
