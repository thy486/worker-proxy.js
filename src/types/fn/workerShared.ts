import type { Fn } from '../../type';
import { isFunction } from '../../typeUtils';
import type * as F from './worker';

export type FunctionProxy<
    TransferableObject,
    T extends Fn,
    TArgs extends Parameters<T> = Parameters<T>,
    TResult extends ReturnType<T> = ReturnType<T>,
    TAwaitedResult extends Awaited<TResult> = Awaited<TResult>,
> = (origin: T) => (...args: TArgs) => Promise<[result: TAwaitedResult, transferListItems?: TransferableObject[]]>;

export type CreateProxy<TransferableObject> = <T extends Fn = Fn>(
    options: F.IRuntimeOptions<TransferableObject, T>,
) => FunctionProxy<TransferableObject, T>;

export const createProxy: CreateProxy<any> = (options) => {
    let proxy: FunctionProxy<any, Fn>;
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
                (...args) =>
                    oldProxy(origin)(...(options.deserialize!(args) as any));
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

export type IDefineFunctionProxyTable<
    TransferableObject,
    T extends Record<any, F.IRuntimeOptions<TransferableObject, Fn>>,
> = {
    [K in keyof T]: T[K] extends F.IRuntimeOptions<TransferableObject, infer Fn>
        ? FunctionProxy<TransferableObject, Fn>
        : never;
};
export type CreateProxyTable<TransferableObject> = <T extends Record<any, F.IRuntimeOptions<TransferableObject, Fn>>>(
    optionsTable: T,
) => IDefineFunctionProxyTable<TransferableObject, T>;

export const createProxyTable: CreateProxyTable<any> = (optionsTable) => {
    const result = {} as Record<any, FunctionProxy<any, Fn>>;
    for (const key in optionsTable) {
        if (optionsTable[key]) {
            result[key] = createProxy(optionsTable[key]);
        }
    }
    return result as any;
};
