import type { Fn, PromiseOrValue } from '../../shared/type';
import { isFunction } from '../../shared/typeUtils';
import type * as F from './master';
import type { MessageFactory, WithMessageSender } from '../message/declare';
import type { IActionData } from '../action';

export type FunctionImpl<TransferableObject, T extends Fn> = WithMessageSender<TransferableObject, T>;

type ArgsBuilder<TransferableObject = unknown, T extends Fn = Fn, TArgs extends Parameters<T> = Parameters<T>> = <
    T extends TArgs,
>(
    ...args: T
) => PromiseOrValue<[args: TArgs, transferItem?: TransferableObject[]]>;
export type CreateMsgHandle<TransferableObject = unknown, T extends Fn = Fn> = (
    msg: MessageFactory<TransferableObject>,
    messageBuilder: (args: Parameters<T>) => Promise<IActionData> | IActionData,
    options?: F.IRuntimeOptions<TransferableObject, T>,
) => F.ExtractWorkerFunction<T>;

const DEFAULT_TO_JSON = () => ({});
export const setProxyDefaultProperty = (proxyObj: object) => {
    // JSON.stringfy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proxyObj as any).toJSON = DEFAULT_TO_JSON;
    // ignore promise check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proxyObj as any).then = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proxyObj as any)[Symbol.for('debug.description')] = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (proxyObj as any)[Symbol.for('nodejs.util.inspect.custom')] = null;
};

export const createMsgHandle: CreateMsgHandle = (msg, msgBuilder, options) => {
    let argsBuilder: ArgsBuilder = isFunction(options?.transfer)
        ? (...args) => [args, options!.transfer!(args)]
        : (...args) => [args];
    let msgHandle: F.ExtractWorkerFunction = async (...args) => {
        const [resolvedArgs, transferItem] = await argsBuilder(...args);
        return msg(await msgBuilder(resolvedArgs), transferItem);
    };
    if (options) {
        if (isFunction(options.serialize)) {
            const oldArgsBuilder = argsBuilder;

            argsBuilder = async (...args) => {
                const [resolvedArgs, transferListItems] = await oldArgsBuilder(...args);
                return [await options.serialize!(resolvedArgs), transferListItems];
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
