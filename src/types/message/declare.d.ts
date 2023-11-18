import { Fn } from '../../type';
import type { UnshiftArgs } from '../../typeUtils';
import type { IActionData } from '../action';

export type WithMessageSender<TransferableObject, T extends Fn> = UnshiftArgs<
    T,
    [messageSender: MessageFactory<TransferableObject>]
>;

export type MessageFactory<TransferableObject = unknown> = <T extends IActionData, TResult>(
    value: T,
    transferList?: TransferableObject[],
) => Promise<TResult>;
