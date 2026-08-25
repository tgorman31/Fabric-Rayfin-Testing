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

  it("allows different keys to proceed independently and preserves failures", async () => {
    const queue = createKeyedWriteQueue();
    const first = deferred<void>();
    const other = queue.enqueue("project_programme:b", async () => "other");
    const failed = queue.enqueue("project_programme:a", async () => { await first.promise; throw new Error("write failed"); });
    await expect(other).resolves.toBe("other");
    first.resolve();
    await expect(failed).rejects.toThrow("write failed");
  });
});
