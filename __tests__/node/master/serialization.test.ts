import { test } from "vitest";
import { spawn } from '../../../src/envs/node/master';
import { Worker } from 'worker_threads';
import type { SerializationExposed } from '../workers/serialization';

test("can use a custom serializer", async t => {
  
    const worker = new Worker(new URL('../workers/serialization', import.meta.url), {
        execArgv: process.env.VITEST ? ['--loader', 'tsx'] : undefined,
    });
    const module = await spawn<SerializationExposed>(worker);
    const table = module.spawnClass('serialization', {
        Bar: {
            instance: {
                getFoo: {
                    deserialize(message) {
                        return module.deserializePointer('serialization', 'Foo', message);
                    },
                }
            }
        }
    });
    const TEST_VALUE = 'Test';
    const foo = new table.Foo(TEST_VALUE);
    const bar = new table.Bar();
    try {
        t.expect(await (await bar.getFoo()).getValue()).equal(TEST_VALUE);
    } finally {
        worker.terminate();
    }
});
