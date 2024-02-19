import { Fn, expose } from '../../../src/envs/browser/worker';

function helloWorld() {
    return 'Hello World';
}

const exposed = {
    hello: Fn.expose({ helloWorld }),
};
export type HelloWorldExposed = typeof exposed;
expose(exposed);
