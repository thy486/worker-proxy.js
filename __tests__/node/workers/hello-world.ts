import { expose, exposeFunctionTable } from '../../../src/envs/node/worker';

function helloWorld() {
    return 'Hello World';
}

const exposed = {
    hello: exposeFunctionTable({ helloWorld }),
};
export type HelloWorldExposed = typeof exposed;
expose(exposed);
