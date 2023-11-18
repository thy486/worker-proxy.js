import type { UnsubscribeFn } from '../../../types/worker/declare';
import { type MasterImplementation, createMasterSpawn, type CreateMasterSpawn } from '../../../types/worker/master';
import type { TransferListItem, Worker } from 'worker_threads';

const workerImpl: MasterImplementation<TransferListItem, Worker> = async (worker, options) => {
    // init worker
    await new Promise<void>((resolve, reject) => {
        worker.once('online', () => {
            worker.removeAllListeners();
            resolve();
        });
        worker.once('error', (e) => {
            worker.removeAllListeners();
            if (options.handleError) {
                reject(options.handleError(e));
            } else {
                reject(e);
            }
        });
    });
    return {
        postMessageToWorker(message, transferList) {
            worker.postMessage(message, transferList);
        },
        subscribeToWorkerMessages(onMessage) {
            worker.on('message', onMessage);
            const unsubscribeFn: UnsubscribeFn = () => {
                worker.off('message', onMessage);
            };
            return unsubscribeFn;
        },
        subscribeToWorkerError(onError) {
            worker.on('error', onError);
            const unsubscribeFn: UnsubscribeFn = () => {
                worker.off('error', onError);
            };
            return unsubscribeFn;
        },
        subscribeToWorkerClose(onExit) {
            worker.on('exit', onExit);
            const unsubscribeFn: UnsubscribeFn = () => {
                worker.off('exit', onExit);
            };
            return unsubscribeFn;
        },
    };
};

export const spawn: CreateMasterSpawn<TransferListItem, Worker> = (...args) =>
    createMasterSpawn(workerImpl as MasterImplementation<unknown, unknown>, ...args);
