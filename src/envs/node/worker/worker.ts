import { isFunction } from '../../../shared/typeUtils';
import type { UnsubscribeFn } from '../../../types/worker/declare';
import {
    defineWorkerExpose,
    type DefineWorkerExpose,
    type WorkerImplementation,
    type WorkerExposedValue as WorkerExposedValueCommon,
} from '../../../types/worker/worker';
import { type TransferListItem, isMainThread, parentPort } from 'worker_threads';

const workerImpl: WorkerImplementation<TransferListItem> = (options) => {
    if (isMainThread) {
        const tips = 'Message worker was defined in the main thread, it will do nothing!';
        if (options.ignoreErrorWhenOnMainThread !== true) {
            throw new Error(tips);
        }
        console.warn(tips);
        return {
            subscribeToMasterMessages() {
                const unsubscribeFn: UnsubscribeFn = () => {};
                return unsubscribeFn;
            },
            postMessageToMaster() {},
        };
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
export type WorkerExposedValue = WorkerExposedValueCommon<TransferListItem>;
