import { expose, Fn } from '../../../src/envs/node/worker';

function helloWorld() {
    return 'Hello World';
}

const exposed = {
    hello: Fn.expose({ helloWorld }),
};
export type HelloWorldExposed = typeof exposed;
expose(exposed);
