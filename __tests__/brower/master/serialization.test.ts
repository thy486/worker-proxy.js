import { test } from "vitest";
import { spawn } from '../../../src/envs/browser/master';
import type { SerializationExposed } from '../workers/serialization';

test("can use a custom serializer", async t => {
  
    const worker = new Worker(new URL("../workers/serialization", import.meta.url), { type: 'module' });
    const module = await spawn<SerializationExposed>(worker);
    const table = module.spawnClass('serialization');
    const TEST_VALUE = 'Test';
    const foo = new table.Foo(TEST_VALUE);
    try {
        t.expect(await foo.getValue()).equal(TEST_VALUE);
    } finally {
        worker.terminate();
    }
});
