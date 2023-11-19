import { CommonActionData, IActionData } from '../action';
import { IMessageCommonResponse, IMessageRequest } from '../message/shared';

export type UnsubscribeFn = () => void;

export interface IWorkerRuntime<TransferableObject = unknown> {
    postMessageToMaster(message: IMessageCommonResponse, transferList?: TransferableObject[]): void;
    subscribeToMasterMessages(onMessage: (data: IMessageRequest<CommonActionData>) => void): UnsubscribeFn;
}

export interface IMasterRuntime<TransferableObject> {
    postMessageToWorker(message: IMessageRequest<IActionData>, transferList?: TransferableObject[]): void;
    subscribeToWorkerMessages(onMessage: (data: IMessageCommonResponse) => void): UnsubscribeFn;
    subscribeToWorkerError(onError: (error: unknown) => void): UnsubscribeFn;
    subscribeToWorkerClose(onExit: (exitCode?: number) => void): UnsubscribeFn;
}
