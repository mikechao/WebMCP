import type { 
  ThreadHistoryAdapter,
  ThreadMessage,
  ExportedMessageRepository,
  ChatModelRunOptions,
  ChatModelRunResult,
  ThreadMessageLike,
} from '@assistant-ui/react';
import { ExportedMessageRepository as MessageRepo } from '@assistant-ui/react';
import { DatabaseUtils, DatabaseManager } from '../database-manager';

// Define the repository item type based on the interface
type ExportedMessageRepositoryItem = {
  message: ThreadMessage;
  parentId: string | null;
};

/**
 * Thread History Adapter that persists messages to IndexedDB
 */
export class IndexedDBHistoryAdapter implements ThreadHistoryAdapter {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  /**
   * Load messages for the current thread in ExportedMessageRepository format
   */
  async load(): Promise<ExportedMessageRepository & { unstable_resume?: boolean }> {
    try {
      // Ensure database is initialized
      await DatabaseManager.initialize();

      // Get messages from database
      const dbMessages = await DatabaseUtils.getThreadMessages(this.threadId);
      
      // Convert to ThreadMessageLike format
      const messageLikes: ThreadMessageLike[] = dbMessages.map(dbMessage => 
        DatabaseUtils.convertToThreadMessage(dbMessage)
      );

      // Use the built-in converter to create proper repository format
      const repository = MessageRepo.fromArray(messageLikes);

      return {
        ...repository,
        unstable_resume: false, // We don't support resume for now
      };
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      // Return empty repository on error
      return {
        headId: null,
        messages: [],
        unstable_resume: false,
      };
    }
  }

  /**
   * Append a new message to the thread
   */
  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    try {
      // Ensure database is initialized
      await DatabaseManager.initialize();

      // Convert ThreadMessage to our database format
      const dbMessage = DatabaseUtils.convertFromThreadMessage(item.message, this.threadId);
      
      // Save to database
      await DatabaseUtils.addMessage(dbMessage);
    } catch (error) {
      console.error('Failed to append message:', error);
      // Don't throw here to avoid breaking the chat flow
      // The message will still be in memory even if saving fails
    }
  }

  /**
   * Resume a conversation that was interrupted (optional)
   */
  resume?: (options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown> = async function* (options) {
    // For now, we don't implement resume functionality
    // This could be extended to continue incomplete assistant responses
    console.log('Resume called for thread', options);
    return;
  };
}

/**
 * Factory function to create history adapter for a specific thread
 */
export function createIndexedDBHistoryAdapter(threadId: string): ThreadHistoryAdapter {
  return new IndexedDBHistoryAdapter(threadId);
}

export default IndexedDBHistoryAdapter;
