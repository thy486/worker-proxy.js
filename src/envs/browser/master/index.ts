/// <reference lib="dom" />
import { isFunction } from '../../../typeUtils';
import type { UnsubscribeFn } from '../../../types/worker/declare';
import { type MasterImplementation, createMasterSpawn, type CreateMasterSpawn } from '../../../types/worker/master';

const workerImpl: MasterImplementation<Transferable, Worker> = (worker, options) => {
    if (isFunction(options.onExit)) {
        worker.addEventListener('close', (event) => {
            options.onExit!(event.code);
        });
    }
    return {
        postMessageToWorker(message, transferList) {
            worker.postMessage(message, transferList!);
        },
        subscribeToWorkerMessages(onMessage) {
            const handleMessage = (event: MessageEvent<any>) => onMessage(event.data);
            worker.addEventListener('message', handleMessage);
            const unsubscribeFn: UnsubscribeFn = () => {
                worker.removeEventListener('message', handleMessage);
            };
            return unsubscribeFn;
        },
        subscribeToWorkerError(onError) {
            worker.addEventListener('error', onError);
            const unsubscribeFn: UnsubscribeFn = () => {
                worker.removeEventListener('error', onError);
            };
            return unsubscribeFn;
        },
        subscribeToWorkerClose(onExit) {
            const handleClosed = (event: CloseEvent) => onExit(event.code);
            worker.addEventListener('close', handleClosed);
            const unsubscribeFn: UnsubscribeFn = () => {
                worker.removeEventListener('close', handleClosed);
            };
            return unsubscribeFn;
        },
    };
};

export const spawn: CreateMasterSpawn<Transferable, Worker> = (...args) => createMasterSpawn(workerImpl, ...args);
