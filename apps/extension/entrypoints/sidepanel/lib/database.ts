import Dexie, { type EntityTable } from 'dexie';
import type { ThreadMessageLike, MessageStatus } from '@assistant-ui/react';

// Database schema interfaces
export interface ChatThread {
  id: string;
  title: string;
  status: 'regular' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: any; // Store as JSON - can be string or MessagePart[]
  createdAt: Date;
  metadata?: any; // Store as JSON to handle various metadata types
  attachments?: any[]; // Store as JSON
  status?: MessageStatus;
}

// Dexie database class
export class ChatDatabase extends Dexie {
  // Declare table types
  threads!: EntityTable<ChatThread, 'id'>;
  messages!: EntityTable<ChatMessage, 'id'>;

  constructor() {
    super('ChatDatabase');
    
    this.version(1).stores({
      threads: '&id, status, createdAt, updatedAt',
      messages: '&id, threadId, createdAt, role'
    });

    // Add hooks for automatic timestamp updates
    this.threads.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
      obj.messageCount = 0;
    });

    this.threads.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updatedAt = new Date();
    });

    this.messages.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
    });
  }
}

// Create database instance
export const db = new ChatDatabase();

// Database utility functions
export class DatabaseUtils {
  // Thread operations
  static async createThread(title: string = 'New Chat'): Promise<ChatThread> {
    const id = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const thread: ChatThread = {
      id,
      title,
      status: 'regular',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };
    
    await db.threads.add(thread);
    return thread;
  }

  static async getThread(id: string): Promise<ChatThread | undefined> {
    return await db.threads.get(id);
  }

  static async getAllThreads(): Promise<ChatThread[]> {
    return await db.threads.toArray().then(threads => 
      threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    );
  }

  static async getRegularThreads(): Promise<ChatThread[]> {
    const threads = await db.threads
      .where('status')
      .equals('regular')
      .toArray();
    return threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async getArchivedThreads(): Promise<ChatThread[]> {
    const threads = await db.threads
      .where('status')
      .equals('archived')
      .toArray();
    return threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async updateThread(id: string, updates: Partial<ChatThread>): Promise<void> {
    await db.threads.update(id, { ...updates, updatedAt: new Date() });
  }

  static async deleteThread(id: string): Promise<void> {
    await db.transaction('rw', db.threads, db.messages, async () => {
      // Delete all messages in the thread first
      await db.messages.where('threadId').equals(id).delete();
      // Then delete the thread
      await db.threads.delete(id);
    });
  }

  static async archiveThread(id: string): Promise<void> {
    await this.updateThread(id, { status: 'archived' });
  }

  static async unarchiveThread(id: string): Promise<void> {
    await this.updateThread(id, { status: 'regular' });
  }

  // Message operations
  static async addMessage(message: Omit<ChatMessage, 'createdAt'>): Promise<ChatMessage> {
    const messageWithTimestamp: ChatMessage = {
      ...message,
      createdAt: new Date(),
    };

    await db.transaction('rw', db.messages, db.threads, async () => {
      // Add the message
      await db.messages.add(messageWithTimestamp);
      
      // Update thread message count and timestamp
      const thread = await db.threads.get(message.threadId);
      if (thread) {
        await db.threads.update(message.threadId, {
          messageCount: thread.messageCount + 1,
          updatedAt: new Date(),
        });
      }
    });

    return messageWithTimestamp;
  }

  static async getThreadMessages(threadId: string): Promise<ChatMessage[]> {
    const messages = await db.messages
      .where('threadId')
      .equals(threadId)
      .toArray();
    return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  static async updateMessage(id: string, updates: Partial<ChatMessage>): Promise<void> {
    await db.messages.update(id, updates);
  }

  static async deleteMessage(id: string): Promise<void> {
    const message = await db.messages.get(id);
    if (!message) return;

    await db.transaction('rw', db.messages, db.threads, async () => {
      // Delete the message
      await db.messages.delete(id);
      
      // Update thread message count
      const thread = await db.threads.get(message.threadId);
      if (thread && thread.messageCount > 0) {
        await db.threads.update(message.threadId, {
          messageCount: thread.messageCount - 1,
          updatedAt: new Date(),
        });
      }
    });
  }

  static async clearThreadMessages(threadId: string): Promise<void> {
    await db.transaction('rw', db.messages, db.threads, async () => {
      // Delete all messages for the thread
      await db.messages.where('threadId').equals(threadId).delete();
      
      // Reset thread message count
      await db.threads.update(threadId, {
        messageCount: 0,
        updatedAt: new Date(),
      });
    });
  }

  // Utility functions
  static async getThreadMessageCount(threadId: string): Promise<number> {
    return await db.messages.where('threadId').equals(threadId).count();
  }

  static async searchThreads(query: string): Promise<ChatThread[]> {
    const lowerQuery = query.toLowerCase();
    return await db.threads
      .filter(thread => 
        thread.title.toLowerCase().includes(lowerQuery)
      )
      .toArray();
  }

  // Conversion utilities for assistant-ui
  static convertToThreadMessage(message: ChatMessage): ThreadMessageLike {
    return {
      id: message.id,
      role: message.role as any,
      content: message.content,
      createdAt: message.createdAt,
      status: message.status,
      attachments: message.attachments,
      metadata: message.metadata,
    };
  }

  static convertFromThreadMessage(
    message: ThreadMessageLike, 
    threadId: string
  ): Omit<ChatMessage, 'createdAt'> {
    return {
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      role: message.role,
      content: message.content,
      metadata: message.metadata ? JSON.parse(JSON.stringify(message.metadata)) : undefined,
      attachments: message.attachments ? [...(message.attachments as any[])] : undefined,
      status: message.status,
    };
  }

  // Database maintenance
  static async cleanup(): Promise<void> {
    // Delete messages older than 30 days for archived threads
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const archivedThreads = await this.getArchivedThreads();
    const oldArchivedThreadIds = archivedThreads
      .filter(thread => thread.updatedAt < thirtyDaysAgo)
      .map(thread => thread.id);

    if (oldArchivedThreadIds.length > 0) {
      await db.transaction('rw', db.messages, db.threads, async () => {
        for (const threadId of oldArchivedThreadIds) {
          await db.messages.where('threadId').equals(threadId).delete();
          await db.threads.delete(threadId);
        }
      });
    }
  }

  static async exportData(): Promise<{ threads: ChatThread[]; messages: ChatMessage[] }> {
    const [threads, messages] = await Promise.all([
      db.threads.toArray(),
      db.messages.toArray(),
    ]);
    
    return { threads, messages };
  }

  static async importData(data: { threads: ChatThread[]; messages: ChatMessage[] }): Promise<void> {
    await db.transaction('rw', db.threads, db.messages, async () => {
      await db.threads.clear();
      await db.messages.clear();
      await db.threads.bulkAdd(data.threads);
      await db.messages.bulkAdd(data.messages);
    });
  }
}

// Initialize database and handle errors
db.on('ready', () => {
  console.log('Chat database initialized successfully');
});

db.on('versionchange', () => {
  console.log('Chat database version changed, reloading...');
  window.location.reload();
});

// Error handling
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'DatabaseClosedError') {
    console.error('Database was closed unexpectedly');
    // Could implement reconnection logic here
  }
});
