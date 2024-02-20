/// <reference lib="dom" />
import { isFunction } from '../../../shared/typeUtils';
import { CommonActionData } from '../../../types/action';
import { IMessageRequest } from '../../../types/message/shared';
import type { UnsubscribeFn } from '../../../types/worker/declare';
import {
    defineWorkerExpose,
    type WorkerImplementation,
    type DefineWorkerExpose,
    type WorkerExposedValue as WorkerExposedValueCommon,
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
        const tips = 'Message worker was defined in the main thread, it will do nothing!';
        if (options.ignoreErrorWhenOnMainThread !== true) {
            throw new Error(tips);
        }
        console.warn(tips);
    }
    if (isFunction(options.onUnhandledRejection)) {
        self.addEventListener('unhandledrejection', options.onUnhandledRejection);
    }
    return {
        subscribeToMasterMessages(onMessage) {
            const handleMessage = (event: MessageEvent<IMessageRequest<CommonActionData>>) => onMessage(event.data);
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

export const expose: DefineWorkerExpose<Transferable> = (...args) => defineWorkerExpose(workerImpl, ...args);
export type { WorkerImplementation, DefineWorkerExpose, UnsubscribeFn };
export type WorkerExposedValue = WorkerExposedValueCommon<Transferable>;
