import { isFunction } from '../../../shared/typeUtils';
import type { UnsubscribeFn } from '../../../types/worker/declare';
import { type WorkerImplementation, defineWorkerExpose, type DefineWorkerExpose } from '../../../types/worker/worker';
import { type TransferListItem, isMainThread, parentPort } from 'worker_threads';

const workerImpl: WorkerImplementation<TransferListItem> = (options) => {
    if (isMainThread) {
        throw new Error('Message worker was defined in the main thread, it will do nothing!');
    }
    if (isFunction(options.onUnhandledRejection)) {
        process.on('unhandledRejection', options.onUnhandledRejection);
    }
    return {
        subscribeToMasterMessages(onMessage) {
            parentPort!.on('message', onMessage);
            const unsubscribeFn: UnsubscribeFn = () => {
                parentPort!.off('message', onMessage);
            };
            return unsubscribeFn;
        },
        postMessageToMaster(message, transferList) {
            parentPort!.postMessage(message, transferList);
        },
    };
};

export const expose: DefineWorkerExpose<TransferListItem> = (...args) => defineWorkerExpose(workerImpl, ...args);
export type { WorkerImplementation, DefineWorkerExpose, UnsubscribeFn };
