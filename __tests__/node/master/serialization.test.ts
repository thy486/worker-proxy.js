/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from 'vitest';
import { spawn } from '../../../src/envs/node/master';
import { Worker } from 'worker_threads';
import type { SerializationExposed } from '../workers/serialization';
import { mergeTuple } from '../../../src/shared/typeUtils';

test('can use a custom serializer', async (t) => {
    const worker = new Worker(new URL('../workers/serialization', import.meta.url), {
        execArgv: process.env.VITEST ? ['--loader', 'tsx'] : undefined,
    });
    // const worker = new Worker('../workers/serialization.ts');
    const module = await spawn<SerializationExposed>(worker);
    const table = module.spawnClass('serialization', {
        Bar: {
            construct: {
                async serialize(input) {
                    return mergeTuple(input, [await module.serializePointer('serialization', 'Foo', input[0])] as const);
                },
            },
            instance: {
                getFoo: {
                    deserialize(message) {
                        return module.deserializePointer('serialization', 'Foo', message);
                    },
                },
            },
        },
        Car: {
            construct: {
                async serialize(input) {
                    return mergeTuple(input, [await module.serializePointer('serialization', 'Bar', input[0])] as const);
                },
            },
            instance: {
                getBar: {
                    deserialize(message) {
                        return module.deserializePointer('serialization', 'Bar', message);
                    },
                },
            },
        },
    });
    const TEST_VALUE = 'Test';
    const foo = new table.Foo(TEST_VALUE);
    const bar = new table.Bar(foo);
    const car = new table.Car(bar as never);
    // await (await car.getBar()).getFoo();
    try {
        t.expect(await (await (await car.getBar()).getFoo()).getValue()).equal(TEST_VALUE);
    } finally {
        worker.terminate();
    }
});
