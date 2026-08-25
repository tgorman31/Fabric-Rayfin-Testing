export type KeyedWriteQueue = {
  enqueue<T>(key: string, operation: () => Promise<T>): Promise<T>;
  whenIdle(): Promise<void>;
};

export function createKeyedWriteQueue(): KeyedWriteQueue {
  const tails = new Map<string, Promise<unknown>>();

  async function whenIdle(): Promise<void> {
    while (tails.size > 0) {
      await Promise.allSettled([...tails.values()]);
    }
  }

  return {
    enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
      const previous = tails.get(key) ?? Promise.resolve();
      // Deliberately do not recover the previous rejection: a failed write
      // invalidates all already-queued successors for this logical record.
      const current = previous.then(operation);
      tails.set(key, current);
      void current.then(
        () => { if (tails.get(key) === current) tails.delete(key); },
        () => { if (tails.get(key) === current) tails.delete(key); },
      );
      return current;
    },
    whenIdle,
  };
}
