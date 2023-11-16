/// <reference lib="dom" />
import { isFunction } from '../../../typeUtils';
import type { UnsubscribeFn } from '../../../types/worker/declare';
import {
    type WorkerImplementation,
    defineWorkerExpose,
    type DefineWorkerExpose,
} from '../../../types/worker/worker';

function isWorkerRuntime() {
    return typeof self !== 'undefined' &&
        isFunction(self.postMessage) &&
        !(typeof self !== 'undefined' && typeof Window !== 'undefined' && self instanceof Window)
        ? true
        : false;
}

const workerImpl: WorkerImplementation<Transferable> = (options) => {
    if (!isWorkerRuntime()) {
        throw new Error('Message worker was defined in the main thread, it will do nothing!');
    }
    if (isFunction(options.onUnhandledRejection)) {
        self.addEventListener('unhandledrejection', options.onUnhandledRejection);
    }
    return {
        subscribeToMasterMessages(onMessage) {
            const handleMessage = (event: MessageEvent<any>) => onMessage(event.data);
            self.addEventListener('message', handleMessage);
            const unsubscribeFn: UnsubscribeFn = () => {
                self.removeEventListener('message', handleMessage);
            };
            return unsubscribeFn;
        },
        postMessageToMaster(message, transferList) {
            self!.postMessage(message, {
                transfer: transferList,
            });
        },
    };
};

export const expose: DefineWorkerExpose<Transferable> = (...args) =>
    defineWorkerExpose(workerImpl, ...args);
