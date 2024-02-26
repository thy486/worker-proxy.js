/// <reference lib="dom" />
import { isFunction } from '../../../shared/typeUtils';
import { IMessageCommonResponse } from '../../../types/message/shared';
import type { UnsubscribeFn } from '../../../types/worker/declare';
import {
    createMasterSpawn,
    MasterSpawnAbstractClass as MasterSpawnAbstractClassCommon,
    type MasterImplementation,
    type CreateMasterSpawn,
} from '../../../types/worker/master';
import { WorkerExposedValue } from '../../../types/worker/worker';

export abstract class MasterSpawnAbstractClass<
    T extends WorkerExposedValue<Transferable>,
> extends MasterSpawnAbstractClassCommon<Transferable, T> {}

const defaultWorkerImpl: MasterImplementation<Transferable, HTMLIFrameElement> = async (iframe, options) => {
    if (isFunction(options.onExit)) {
        iframe.addEventListener('close', (_event) => {
            options.onExit!();
        });
    }
    const iframeWindow = await new Promise<Window>((resolve, reject) => {
        iframe.addEventListener('load', (e) => {
            if (iframe.contentWindow) {
                resolve(iframe.contentWindow);
                return;
            }
            reject(e);
        });
        iframe.addEventListener('error', reject, { once: true });
    });
    return {
        postMessageToWorker(message, transferList) {
            iframeWindow.postMessage(message, {
                transfer: transferList!
            });
        },
        subscribeToWorkerMessages(onMessage) {
            const handleMessage = (event: MessageEvent<IMessageCommonResponse>) => onMessage(event.data);
            window.addEventListener('message', handleMessage);
            const unsubscribeFn: UnsubscribeFn = () => {
                window.removeEventListener('message', handleMessage);
            };
            return unsubscribeFn;
        },
        subscribeToWorkerError(onError) {
            iframeWindow.addEventListener('error', onError);
            const unsubscribeFn: UnsubscribeFn = () => {
                iframeWindow.removeEventListener('error', onError);
            };
            return unsubscribeFn;
        },
        subscribeToWorkerClose(onExit) {
            const handleClosed = () => onExit();
            iframeWindow.addEventListener('close', handleClosed);
            const unsubscribeFn: UnsubscribeFn = () => {
                iframeWindow.removeEventListener('close', handleClosed);
            };
            return unsubscribeFn;
        },
    };
};

export const spawn: CreateMasterSpawn<Transferable, HTMLIFrameElement> = (...args) =>
    createMasterSpawn(defaultWorkerImpl, ...args);
