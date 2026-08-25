import { describe, expect, it } from "vitest";

import { createKeyedWriteQueue } from "@/domain/keyedWriteQueue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("keyed programme write queue", () => {
  it("serializes writes for the same key in enqueue order", async () => {
    const queue = createKeyedWriteQueue();
    const first = deferred<string>();
    const events: string[] = [];
    const one = queue.enqueue("project_programme:a", async () => { events.push("a-start"); const value = await first.promise; events.push("a-end"); return value; });
    const two = queue.enqueue("project_programme:a", async () => { events.push("b-start"); return "b"; });
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["a-start"]);
    first.resolve("a");
    await expect(one).resolves.toBe("a");
    await expect(two).resolves.toBe("b");
    expect(events).toEqual(["a-start", "a-end", "b-start"]);
  });

  it("fails closed for queued same-key successors and recovers for a fresh write", async () => {
    const queue = createKeyedWriteQueue();
    const events: string[] = [];
    const first = queue.enqueue("project_programme:a", async () => {
      events.push("a-start");
      throw new Error("write failed");
    });
    const successor = queue.enqueue("project_programme:a", async () => {
      events.push("b-start");
      return "b";
    });
    await expect(first).rejects.toThrow("write failed");
    await expect(successor).rejects.toThrow("write failed");
    expect(events).toEqual(["a-start"]);

    await expect(queue.enqueue("project_programme:a", async () => {
      events.push("c-start");
      return "c";
    })).resolves.toBe("c");
    expect(events).toEqual(["a-start", "c-start"]);
  });

  it("keeps different keys independent and drains all active keys", async () => {
    const queue = createKeyedWriteQueue();
    const first = deferred<void>();
    const events: string[] = [];
    const failed = queue.enqueue("project_programme:a", async () => {
      events.push("a-start");
      await first.promise;
      throw new Error("write failed");
    });
    const other = queue.enqueue("project_programme:b", async () => {
      events.push("b-start");
      return "other";
    });
    await expect(other).resolves.toBe("other");
    expect(events).toContain("b-start");
    const idle = queue.whenIdle();
    first.resolve();
    await expect(failed).rejects.toThrow("write failed");
    await expect(idle).resolves.toBeUndefined();
  });
});
