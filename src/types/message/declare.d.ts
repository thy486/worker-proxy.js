import type { UnshiftArgs } from '../../typeUtils';
import type { IActionData } from '../action';

export type WithMessageSender<TransferableObject, T extends (...args: any) => any> = UnshiftArgs<
    T,
    [messageSender: MessageFactory<TransferableObject>]
>;

export type MessageFactory<TransferableObject> = <T extends IActionData, TResult>(
    value: T,
    transferList?: TransferableObject[],
) => Promise<TResult>;
