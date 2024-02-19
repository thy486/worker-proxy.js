import path from 'path';
import fs from 'fs';
import { spawn } from '../../src/envs/node/master';
import { Worker } from 'worker_threads';
import type { ExportsValue } from './workerExports';

(async () => {
    let workerPath = path.join(__dirname, 'workerExports.ts');
    if (!fs.existsSync(workerPath)) {
        workerPath = path.join(__dirname, 'workerExports.js');
    }
    const worker = new Worker(workerPath);
    const wk = await spawn<ExportsValue>(worker);
    const fns = wk.spawnFunction('functionTable', {
        value: {
            deserialize(message) {
                return message;
            },
        },
    });
    const cls = wk.spawnClass('classTable', {
        Foo: {
            construct: {
                async serialize(input) {
                    return mergeTuple(input, [await wk.serializePointer('classTable', 'Bar', input[0])] as const);
                },
            },
            instance: {
                bar: {
                    deserialize(message) {
                        return wk.deserializePointer('classTable', 'Bar', message);
                    },
                },
            },
        },
    });
    console.log(JSON.stringify(cls));
    const bar = new cls.Bar();
    const foo = new cls.Foo(bar);

    console.log(cls);
    console.log(wk);
    console.log(await foo.bar());
    const n = await wk.free(foo);

    console.log(n);
    console.log(await (await new cls.Foo(bar).bar()).value());
    worker.terminate();
})().catch(console.error);

type CreateTuple<T extends any[]> = (...args: T) => T;
export type MergedTuple<T extends any[], T2 extends any[], F = CreateTuple<T>> = Parameters<
    F extends (...args: infer Args) => any
        ? (
              ...args: {
                  [K in keyof Args]: K extends keyof T2 ? T2[K] : Args[K];
              }
          ) => any
        : never
>;
type MergeTuple = <T extends any[], T2 extends any[]>(origin: T, current: T2) => MergedTuple<T, T2>;
const mergeTuple: MergeTuple = (a, b) => {
    for (let i = 0, len = b.length; i < len; i++) {
        a[i] = b[i];
    }
    return a;
};
