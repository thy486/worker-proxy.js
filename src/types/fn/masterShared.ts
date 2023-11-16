import type { Fn } from '../../type';
import { isFunction } from '../../typeUtils';
import type * as F from './master';
import type { MessageFactory, WithMessageSender } from '../message/declare';
import type { IActionData } from '../action';

export type FunctionImpl<TransferableObject, T extends Fn> = WithMessageSender<TransferableObject, T>;

type ArgsBuilder<TransferableObject, T extends Fn, TArgs extends Parameters<T> = Parameters<T>> = <T extends TArgs>(
    ...args: T
) => [args: TArgs, transferItem?: TransferableObject[]];
export type CreateMsgHandle<TransferableObject, T extends Fn = Fn> = (
    msg: MessageFactory<TransferableObject>,
    messageBuilder: (args: Parameters<T>) => Promise<IActionData> | IActionData,
    options?: F.IRuntimeOptions<TransferableObject, T>,
) => F.ExtractWorkerFunction<T>;

export const createMsgHandle: CreateMsgHandle<any> = (msg, msgBuilder, options) => {
    let argsBuilder: ArgsBuilder<any, Fn> = isFunction(options?.transfer)
        ? (...args) => [args, options!.transfer!(args)]
        : (...args) => [args];
    let msgHandle: F.ExtractWorkerFunction<Fn> = async (...args) => {
        const [resolvedArgs, transferItem] = argsBuilder(...args);
        return msg(await msgBuilder(resolvedArgs), transferItem);
    };
    if (options) {
        if (isFunction(options.serialize)) {
            const oldArgsBuilder = argsBuilder;

            argsBuilder = (...args) => {
                const [resolvedArgs, transferListItems] = oldArgsBuilder(...args);
                return [options.serialize!(resolvedArgs), transferListItems];
            };
        }
        if (isFunction(options.deserialize)) {
            const oldMsgHandle = msgHandle;

            msgHandle = async (...args) => {
                return options.deserialize!(await oldMsgHandle(...args));
            };
        }
    }
    return msgHandle;
};
