import type { Fn } from '../../type';
import { isFunction } from '../../typeUtils';
import type * as F from './worker';

export type FunctionProxy<
    TransferableObject = unknown,
    T extends Fn = Fn,
    TArgs extends Parameters<T> = Parameters<T>,
    TResult extends ReturnType<T> = ReturnType<T>,
    TAwaitedResult extends Awaited<TResult> = Awaited<TResult>,
> = (origin: T) => (...args: TArgs) => Promise<[result: TAwaitedResult, transferListItems?: TransferableObject[]]>;

export type CreateProxy<TransferableObject = unknown> = <T extends Fn = never>(
    options: F.IRuntimeOptions<TransferableObject, T>,
) => FunctionProxy<TransferableObject, T>;

export const createProxy: CreateProxy = (options) => {
    let proxy: FunctionProxy;
    if (isFunction(options.transfer)) {
        proxy =
            (origin) =>
            async (...args) => {
                const result = await origin(...args);
                return [result, options.transfer!(result)];
            };
    } else {
        proxy =
            (origin) =>
            async (...args) => [await origin(...args)];
    }
    if (isFunction(options.deserialize)) {
        const oldProxy = proxy;
        proxy =
            (origin) =>
            async (...args) =>
                oldProxy(origin)(...((await options.deserialize!(args)) as never[]));
    }
    if (isFunction(options.serialize)) {
        const oldProxy = proxy;
        proxy =
            (origin) =>
            async (...args) => {
                const [result, transferListItems] = await oldProxy(origin)(...args);
                return [options.serialize!(result), transferListItems];
            };
    }
    return proxy;
};

export type IDefineFunctionProxyTable<TransferableObject, T> = {
    [K in keyof T]: T[K] extends F.IRuntimeOptions<TransferableObject, infer Fn>
        ? FunctionProxy<TransferableObject, Fn>
        : never;
};
export type CreateProxyTable<TransferableObject = unknown> = <T extends Record<never, F.IRuntimeOptions>>(
    optionsTable: T,
) => IDefineFunctionProxyTable<TransferableObject, T>;

export const createProxyTable: CreateProxyTable = (optionsTable) => {
    const result = {} as Record<string, FunctionProxy>;
    for (const key in optionsTable) {
        if (optionsTable[key]) {
            result[key] = createProxy(optionsTable[key] as F.IRuntimeOptions);
        }
    }
    return result as IDefineFunctionProxyTable<unknown, never>;
};
