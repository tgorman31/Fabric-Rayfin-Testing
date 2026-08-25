export type KeyedWriteQueue = {
  enqueue<T>(key: string, operation: () => Promise<T>): Promise<T>;
};

export function createKeyedWriteQueue(): KeyedWriteQueue {
  const tails = new Map<string, Promise<unknown>>();
  return {
    enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
      const previous = tails.get(key) ?? Promise.resolve();
      const current = previous.catch(() => undefined).then(operation);
      tails.set(key, current);
      void current.then(
        () => { if (tails.get(key) === current) tails.delete(key); },
        () => { if (tails.get(key) === current) tails.delete(key); },
      );
      return current;
    },
  };
}
