import { test } from 'vitest';
import { spawn } from '../../../src/envs/node/master';
import { Worker } from 'worker_threads';
import type { XorBufferExposed } from '../workers/arraybuffer-xor';

test('can pass transferable objects on thread call', async (t) => {
    const ARRAT_BUFFER_LENGTH = 64;
    const XOR_VALUE = 15;
    const testData = new ArrayBuffer(ARRAT_BUFFER_LENGTH);

    const worker = new Worker(new URL('../workers/arraybuffer-xor', import.meta.url), {
        execArgv: process.env.VITEST ? ['--loader', 'tsx'] : undefined,
    });
    const module = await spawn<XorBufferExposed>(worker);
    const table = module.spawnFunction('xor', {
        xor: {
            transfer(input) {
                return [input[0]];
            },
        },
    });

    const returnedBuffer = await table.xor(testData, XOR_VALUE);

    t.expect(returnedBuffer.byteLength).equal(ARRAT_BUFFER_LENGTH);

    t.expect(returnedBuffer).deep.equal(new Uint8Array(new ArrayBuffer(ARRAT_BUFFER_LENGTH)).fill(XOR_VALUE).buffer);

    worker.terminate();
});
