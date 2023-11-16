import type * as S from '../../serializers';
import * as FS from './workerShared';
import type { Fn } from '../../type';
import { type Equal, isFunction } from '../../typeUtils';
import type { TransferableOptions } from '../../transferable';

const $FUNCTION_DEFINE = Symbol('function::define');

export interface IRuntimeOptions<
    TransferableObject,
    T extends Fn,
    Args = Parameters<T>,
    Result = Awaited<ReturnType<T>>,
> extends TransferableOptions<TransferableObject, Result>,
        S.Serializer<Args, Result, Args, unknown> {}

export interface IDefinedModuleTableExport<
    TransferableObject,
    T extends Fn,
    TOptions extends IRuntimeOptions<TransferableObject, T>,
> {
    [$FUNCTION_DEFINE]: true;
    value: T;
    options?: TOptions;
}

export type ModuleTableExport<
    TransferableObject,
    T extends Fn,
    TOptions extends IRuntimeOptions<TransferableObject, T> = IRuntimeOptions<TransferableObject, T>,
> = T | IDefinedModuleTableExport<TransferableObject, T, TOptions>;

export type ExtractModuleTableSerializerExport<
    TFn extends Fn,
    S extends S.Serializer<any, any>,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TArgs, TResult> = S.WithDefault<S, TArgs, TResult>,
> = TDefaultSerializer extends S.Serializer<infer MsgIn, infer MsgOut, infer _, infer SerMsgOut>
    ? Equal<SerMsgOut, MsgOut> extends true
        ? TFn
        : MsgIn extends any[]
          ? (...args: MsgIn) => Promise<SerMsgOut>
          : // Args will always be array
            TFn
    : TFn;

export type ExposedModuleTableItem<
    TransferableObject,
    TFn extends Fn = Fn,
    TOptions extends IRuntimeOptions<any, any, any> = IRuntimeOptions<any, any, any>,
> = {
    value: TFn;
    proxy: TOptions extends never
        ? FS.FunctionProxy<TransferableObject, Fn>
        : FS.FunctionProxy<TransferableObject, TFn>;
};
type ExtractModuleTableOptionsExport<T extends Fn, TOptions> = TOptions extends S.Serializer<any, any>
    ? ExtractModuleTableSerializerExport<T, TOptions>
    : T;

export type ExposedModuleTable<
    TransferableObject,
    T extends Record<string, any> = Record<string, ModuleTableExport<TransferableObject, Fn>>,
> = {
    [K in keyof T]: T[K] extends IDefinedModuleTableExport<infer _, infer TFn, infer TOptions>
        ? T[K]['options'] extends undefined
            ? ExposedModuleTableItem<TransferableObject, ExtractModuleTableOptionsExport<TFn, TOptions>, never>
            : ExposedModuleTableItem<TransferableObject, ExtractModuleTableOptionsExport<TFn, TOptions>, TOptions>
        : T[K] extends Fn
          ? ExposedModuleTableItem<TransferableObject, T[K]>
          : ExposedModuleTableItem<TransferableObject>;
};

export type DefineModuleTableExport<TransferableObject> = <
    T extends Fn,
    TOptions extends IRuntimeOptions<TransferableObject, T>,
>(
    fn: T,
    options?: TOptions,
) => IDefinedModuleTableExport<TransferableObject, T, TOptions>;

export type ExposeModuleTable<TransferableObject> = <T extends Record<string, any>>(
    moduleTable: T,
) => ExposedModuleTable<TransferableObject, T>;

export const define: DefineModuleTableExport<any> = (fn, options) => ({
    [$FUNCTION_DEFINE]: true,
    value: fn,
    options,
});

export const expose = ((moduleTable: Record<string, ModuleTableExport<any, Fn>>) => {
    const result: ExposedModuleTable<any, any> = {};
    for (const key in moduleTable) {
        const exportItem = moduleTable[key];

        if (isFunction(exportItem)) {
            result[key] = {
                value: exportItem,
            } as ExposedModuleTableItem<any, Fn, IRuntimeOptions<any, Fn>>;
            continue;
        }

        const item = {
            value: exportItem.value,
        } as ExposedModuleTableItem<any, Fn, IRuntimeOptions<any, Fn>>;
        if (exportItem.options) {
            item.proxy = FS.createProxy(exportItem.options);
        }
        result[key] = item;
    }

    return result;
}) as ExposeModuleTable<any>;
