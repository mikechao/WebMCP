import type { 
  unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  ThreadMessage,
} from '@assistant-ui/react';
import { DatabaseUtils, type ChatThread } from '../database';

// Re-define types based on the interface expected by RemoteThreadListAdapter
type RemoteThreadListResponse = {
  threads: Array<{
    readonly status: 'regular' | 'archived';
    readonly remoteId: string;
    readonly externalId?: string | undefined;
    readonly title?: string | undefined;
  }>;
};

type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

// Create a simple readable stream type to avoid external dependency
type AssistantStream = ReadableStream;

/**
 * Custom RemoteThreadListAdapter that uses IndexedDB for thread management
 */
export class IndexedDBThreadListAdapter implements RemoteThreadListAdapter {
  
  /**
   * List all threads (regular and archived)
   */
  async list(): Promise<RemoteThreadListResponse> {
    try {
      const [regularThreads, archivedThreads] = await Promise.all([
        DatabaseUtils.getRegularThreads(),
        DatabaseUtils.getArchivedThreads(),
      ]);

      return {
        threads: [
          ...regularThreads.map(thread => ({
            status: 'regular' as const,
            remoteId: thread.id,
            externalId: undefined,
            title: thread.title,
          })),
          ...archivedThreads.map(thread => ({
            status: 'archived' as const,
            remoteId: thread.id,
            externalId: undefined,
            title: thread.title,
          })),
        ],
      };
    } catch (error) {
      console.error('Failed to list threads:', error);
      throw error;
    }
  }

  /**
   * Initialize a new thread
   */
  async initialize(threadId: string): Promise<RemoteThreadInitializeResponse> {
    try {
      // Create thread in database
      const thread = await DatabaseUtils.createThread(`New Chat`);
      
      return {
        remoteId: thread.id,
        externalId: undefined, // We don't use external IDs in our implementation
      };
    } catch (error) {
      console.error('Failed to initialize thread:', error);
      throw error;
    }
  }

  /**
   * Rename a thread
   */
  async rename(remoteId: string, newTitle: string): Promise<void> {
    try {
      await DatabaseUtils.updateThread(remoteId, { title: newTitle });
    } catch (error) {
      console.error('Failed to rename thread:', error);
      throw error;
    }
  }

  /**
   * Archive a thread
   */
  async archive(remoteId: string): Promise<void> {
    try {
      await DatabaseUtils.archiveThread(remoteId);
    } catch (error) {
      console.error('Failed to archive thread:', error);
      throw error;
    }
  }

  /**
   * Unarchive a thread
   */
  async unarchive(remoteId: string): Promise<void> {
    try {
      await DatabaseUtils.unarchiveThread(remoteId);
    } catch (error) {
      console.error('Failed to unarchive thread:', error);
      throw error;
    }
  }

  /**
   * Delete a thread permanently
   */
  async delete(remoteId: string): Promise<void> {
    try {
      await DatabaseUtils.deleteThread(remoteId);
    } catch (error) {
      console.error('Failed to delete thread:', error);
      throw error;
    }
  }

  /**
   * Generate a title for the thread based on conversation content
   */
  async generateTitle(
    remoteId: string, 
    messages: readonly ThreadMessage[]
  ): Promise<AssistantStream> {
    try {
      // Extract the first few messages to generate a meaningful title
      const relevantMessages = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .slice(0, 3); // Use first few messages for context

      if (relevantMessages.length === 0) {
        // No messages to base title on, use default
        await DatabaseUtils.updateThread(remoteId, { 
          title: 'New Chat' 
        });
        return this.createEmptyStream();
      }

      // Extract text content from messages
      const conversationText = relevantMessages
        .map(msg => {
          if (typeof msg.content === 'string') {
            return msg.content;
          } else if (Array.isArray(msg.content)) {
            return msg.content
              .filter(part => part.type === 'text')
              .map(part => (part as any).text)
              .join(' ');
          }
          return '';
        })
        .join(' ')
        .slice(0, 200); // Limit length

      // Generate a simple title based on the conversation
      const title = this.generateSimpleTitle(conversationText);
      
      // Update the thread with the new title
      await DatabaseUtils.updateThread(remoteId, { title });

      return this.createEmptyStream();
    } catch (error) {
      console.error('Failed to generate title:', error);
      // Fallback to default title
      await DatabaseUtils.updateThread(remoteId, { 
        title: 'Chat ' + new Date().toLocaleDateString() 
      });
      return this.createEmptyStream();
    }
  }

  /**
   * Generate a simple title from conversation text
   */
  private generateSimpleTitle(text: string): string {
    if (!text || text.trim().length === 0) {
      return 'New Chat';
    }

    // Clean up the text
    const cleanText = text
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Split into words and take first few meaningful ones
    const words = cleanText
      .split(' ')
      .filter(word => word.length > 2) // Filter out short words
      .slice(0, 4); // Take first 4 meaningful words

    if (words.length === 0) {
      return 'New Chat';
    }

    // Create title with proper capitalization
    const title = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Limit length and add ellipsis if needed
    return title.length > 30 ? title.slice(0, 30) + '...' : title;
  }

  /**
   * Create an empty readable stream for the generateTitle method
   */
  private createEmptyStream(): AssistantStream {
    return new ReadableStream({
      start(controller) {
        controller.close();
      }
    });
  }
}

/**
 * Factory function to create the thread list adapter
 */
export function createIndexedDBThreadListAdapter(): RemoteThreadListAdapter {
  return new IndexedDBThreadListAdapter();
}

export default IndexedDBThreadListAdapter;
