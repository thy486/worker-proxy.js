import { expose, Fn } from '../../../src/envs/node/worker';

function xor(buffer: ArrayBuffer, value: number) {
    const view = new Uint8Array(buffer);
    view.forEach((byte, offset) => view.set([byte ^ value], offset));
    return buffer;
}

const exposed = {
    xor: Fn.expose({ xor: Fn.define(xor, {
        transfer(input) {
            return [input];
        },
    }) }),
};
export type XorBufferExposed = typeof exposed;
expose(exposed);
