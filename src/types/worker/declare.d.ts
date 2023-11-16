import { CommonActionData, IActionData } from '../action';
import { IMessageCommonResponse, IMessageRequest } from '../message/shared';

type UnsubscribeFn = () => void;

export interface IWorkerRuntime<TransferableObject = any> {
    postMessageToMaster(message: IMessageCommonResponse<unknown, any>, transferList?: TransferableObject[]): void;
    subscribeToMasterMessages(onMessage: (data: IMessageRequest<CommonActionData>) => void): UnsubscribeFn;
}

export interface IMasterRuntime<TransferableObject = any> {
    postMessageToWorker(message: IMessageRequest<IActionData>, transferList?: TransferableObject[]): void;
    subscribeToWorkerMessages(onMessage: (data: IMessageCommonResponse<unknown, any>) => void): UnsubscribeFn;
    subscribeToWorkerError(onError: (error: any) => void): UnsubscribeFn;
    subscribeToWorkerClose(onExit: (exitCode?: number) => void): UnsubscribeFn;
}
