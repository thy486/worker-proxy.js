import type * as S from '../../shared/serializers';
import * as FWS from './workerShared';
import * as FS from './shared';
import type { Fn } from '../../shared/type';
import { isFunction } from '../../shared/typeUtils';
import type { ITransferableOptions } from '../../shared/transferable';

const $FUNCTION_DEFINE = Symbol('function::define');

export interface IRuntimeOptions<TransferableObject = unknown, T extends Fn = Fn, Result = Awaited<ReturnType<T>>>
    extends ITransferableOptions<TransferableObject, Result>,
        FS.IFunctionResultBySerialize<T> {}

export interface IDefinedModuleTableExport<T extends Fn, TOptions extends IRuntimeOptions> {
    [$FUNCTION_DEFINE]: true;
    value: T;
    options?: TOptions;
}

export type ModuleTableExport<
    TransferableObject = unknown,
    T extends Fn = Fn,
    TOptions extends IRuntimeOptions = IRuntimeOptions<TransferableObject, T>,
> = T | IDefinedModuleTableExport<T, TOptions>;

export type ExposedModuleTableItem<
    TransferableObject = unknown,
    TFn extends Fn = Fn,
    TOptions extends IRuntimeOptions = IRuntimeOptions,
> = {
    value: TFn;
    proxy: TOptions extends never
        ? FWS.FunctionProxy<TransferableObject, Fn>
        : FWS.FunctionProxy<TransferableObject, TFn>;
};
export type ExtractModuleTableOptionsExport<T extends Fn, TOptions> = TOptions extends S.Serializer
    ? FS.ExtractFunctionResultFnBySerialize<T, TOptions>
    : T;

export type ExposedModuleTable<
    TransferableObject = unknown,
    T extends Record<string, ModuleTableExport<TransferableObject, Fn>> = Record<
        string,
        ModuleTableExport<TransferableObject, Fn>
    >,
> = {
    [K in keyof T]: T[K] extends IDefinedModuleTableExport<infer TFn, infer TOptions>
        ? T[K]['options'] extends undefined
            ? ExposedModuleTableItem<TransferableObject, ExtractModuleTableOptionsExport<TFn, TOptions>, never>
            : ExposedModuleTableItem<TransferableObject, ExtractModuleTableOptionsExport<TFn, TOptions>, TOptions>
        : T[K] extends Fn
          ? ExposedModuleTableItem<TransferableObject, T[K]>
          : ExposedModuleTableItem<TransferableObject>;
};

export type DefineModuleTableExport<TransferableObject = unknown> = <
    T extends Fn,
    TOptions extends IRuntimeOptions<TransferableObject, T>,
>(
    fn: T,
    options?: TOptions,
) => IDefinedModuleTableExport<T, TOptions>;

export type ExposeModuleTable<TransferableObject = never> = <
    T extends Record<string, ModuleTableExport<TransferableObject, Fn>>,
>(
    moduleTable: T,
) => ExposedModuleTable<TransferableObject, T>;

export const define: DefineModuleTableExport = (fn, options) => ({
    [$FUNCTION_DEFINE]: true,
    value: fn,
    options,
});

export const expose = ((moduleTable: Record<string, ModuleTableExport>) => {
    const result: ExposedModuleTable = {};
    for (const key in moduleTable) {
        const exportItem = moduleTable[key];

        if (isFunction(exportItem)) {
            result[key] = {
                value: exportItem,
            } as ExposedModuleTableItem;
            continue;
        }

        const item = {
            value: exportItem.value,
        } as ExposedModuleTableItem;
        if (exportItem.options) {
            item.proxy = FWS.createProxy(exportItem.options);
        }
        result[key] = item;
    }

    return result;
}) as ExposeModuleTable;
