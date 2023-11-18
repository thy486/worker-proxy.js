import { expose, Fn, Class } from '../../src/envs/node/worker';
import { MessageChannel, type MessagePort } from 'worker_threads';

export class Bar {
    public value2: number = 1;
    public value(): string {
        return 'bar';
    }
}
export class Foo {
    private _port!: MessagePort;
    public value2: number = 1;
    constructor(bar: Bar) {}

    public value(): string {
        return 'foo';
    }

    public print(): void {
        console.log(this._port);
    }

    public message(): MessagePort {
        const channel = new MessageChannel();
        this._port = channel.port1;
        return channel.port2;
    }

    public bar(): Bar {
        return new Bar();
    }

    public static new(): Foo {
        return new Foo('' as never);
    }

    public static channel(): MessagePort {
        const channel = new MessageChannel();
        return channel.port1;
    }
}

function value(): string {
    return 'foo';
}

function channel(): MessagePort {
    return new MessageChannel().port1;
}

const classTable = Class.expose({
    Foo: Class.define(Foo, {
        construct: {
            deserialize(message) {
                return [Class.fromMasterInstance(message[0])] as const;
            },
        },
        onFree(instance) {
            return 1;
        },
        instance: {
            bar: {
                serialize(input) {
                    return Class.createPointer(Bar, input);
                },
            },
        },
    }),
    Bar: Class.define(Bar, {
        onFree(instance) {
            return 2;
        },
    }),
});
const functionTable = Fn.expose({
    value,
    channel: Fn.define(channel, {
        transfer(input) {
            return [input];
        },
    }),
});
const exportsValue = {
    classTable,
    functionTable,
};
export type ExportsValue = typeof exportsValue;
expose(exportsValue, {
    onUnhandledRejection(e) {
        console.error(e);
    },
});
