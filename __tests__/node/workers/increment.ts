import { expose, Fn } from '../../../src/envs/node/worker';

let counter = 0;

function increment(by: number = 1) {
    counter += by;
    return counter;
}

const exposed = {
    increment: Fn.expose({ increment }),
};
export type IncrementExposed = typeof exposed;
expose(exposed);
