import { DatabaseUtils, db } from './database';

export class DatabaseManager {
  private static initialized = false;

  /**
   * Initialize the database and perform any necessary migrations
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Open the database
      await db.open();
      
      // Create a default thread if none exist
      const threads = await DatabaseUtils.getAllThreads();
      if (threads.length === 0) {
        await DatabaseUtils.createThread('Welcome Chat');
      }

      // Perform cleanup of old data
      await DatabaseUtils.cleanup();

      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Reset the database (useful for development/testing)
   */
  static async reset(): Promise<void> {
    try {
      await db.delete();
      this.initialized = false;
      await this.initialize();
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  static async getStats(): Promise<{
    threadCount: number;
    messageCount: number;
    regularThreads: number;
    archivedThreads: number;
  }> {
    const [allThreads, allMessages] = await Promise.all([
      DatabaseUtils.getAllThreads(),
      db.messages.toArray(),
    ]);

    return {
      threadCount: allThreads.length,
      messageCount: allMessages.length,
      regularThreads: allThreads.filter(t => t.status === 'regular').length,
      archivedThreads: allThreads.filter(t => t.status === 'archived').length,
    };
  }

  /**
   * Check if database is healthy
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await db.threads.limit(1).toArray();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export for easy access
export { DatabaseUtils, db };
