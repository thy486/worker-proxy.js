import { test } from "vitest";
import { spawn } from '../../../src/envs/browser/master';
import type { HelloWorldExposed } from '../workers/hello-world';
import type { IncrementExposed } from '../workers/increment';


test('can spawn and terminate a thread', async t => {
    const worker = new Worker(new URL("../workers/hello-world", import.meta.url), { type: 'module' });
    const module = await spawn<HelloWorldExposed>(worker);
    const table = module.spawnFunction('hello');
    t.expect(await table.helloWorld()).equal('Hello World');
    worker.terminate();
});

test("can call a function thread more than once", async t => {
    const worker = new Worker(new URL("../workers/increment", import.meta.url), { type: 'module' });
    const module = await spawn<IncrementExposed>(worker);
    const table = module.spawnFunction('increment');

    t.expect(await table.increment()).equal(1);
    t.expect(await table.increment()).equal(2);
    t.expect(await table.increment()).equal(3);
    worker.terminate();
});
  