import { spawn } from '../../src/envs/browser/master';
import type { ExportsValue } from './workerExports';
import workerUrl from './workerExports?worker&url';

(async () => {
    // const worker = new Worker(import.meta.dir + "/workerExports.ts");
    const worker = new Worker(workerUrl, { type: 'module' });
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
    const foo = new cls.Foo();

    console.log(cls);
    console.log(wk);
    console.log(await foo.value());
    const n = await wk.free(foo);
    console.log(n);
    console.log(await fns.channel());
    console.log(await (await new cls.Foo().bar()).value());
    // worker.terminate();
})().catch(console.error);
