import { spawn } from '../../src/envs/iframe/master';
import type { ExportsValue } from './iframe';

(async () => {
    const instance = document.getElementById('test-iframe') as HTMLIFrameElement;
    const wk = await spawn<ExportsValue>(instance);
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
    // instance.terminate();
})().catch(console.error);
