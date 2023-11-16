import type { ClassType, Fn, FunctionTable, InstancePropertyTable, StaticPropertyTable } from '../../type';
import type { Prettify } from '../../typeUtils';
import type * as FS from '../fn/workerShared';
import type { IClassDefineOptions, IClassDefineRequiredOptions } from './shared';
import type { IConstructFunctionOption } from './worker';

export type ClassStaticExportProxy<
    TransferableObject,
    T extends ClassType,
    TStaticProperties extends FunctionTable<StaticPropertyTable<T>> = FunctionTable<StaticPropertyTable<T>>,
> = {
    [K in keyof TStaticProperties]: FS.FunctionProxy<TransferableObject, TStaticProperties[K]>;
};
export type ClassInstanceExportProxy<
    TransferableObject,
    T extends ClassType,
    TInstanceProperties extends FunctionTable<InstancePropertyTable<T>> = FunctionTable<InstancePropertyTable<T>>,
> = {
    [K in keyof TInstanceProperties]: FS.FunctionProxy<TransferableObject, TInstanceProperties[K]>;
};
export type ConstructorExportProxy<
    T extends ClassType,
    TArgs extends ConstructorParameters<T> = ConstructorParameters<T>,
> = (...args: TArgs) => TArgs;

export type ExtractFunctionProxy<TransferableObject, TOptionsTable, TProperties> = {
    [K in keyof TOptionsTable]: K extends keyof TProperties
        ? TProperties[K] extends Fn
            ? FS.FunctionProxy<TransferableObject, TProperties[K]>
            : never
        : never;
};

export type ExtractProxyFromOptions<
    TransferableObject,
    T extends ClassType = ClassType,
    TOptions extends IClassDefineOptions<any, any, any> = IClassDefineOptions<any, any, any>,
    TStaticProperties extends StaticPropertyTable<T> = StaticPropertyTable<T>,
    TInstanceProperties extends InstancePropertyTable<T> = InstancePropertyTable<T>,
> = Readonly<

        IClassDefineRequiredOptions<
            ExtractFunctionProxy<TransferableObject, TOptions['static'], TStaticProperties>,
            ExtractFunctionProxy<TransferableObject, TOptions['instance'], TInstanceProperties>,
            TOptions['construct'] extends IConstructFunctionOption<TransferableObject, any>
                ? ConstructorExportProxy<T>
                : never
        >
>;

export type ClassExportProxy<TransferableObject, T extends ClassType> = IClassDefineOptions<
    ClassStaticExportProxy<TransferableObject, T>,
    ClassInstanceExportProxy<TransferableObject, T>,
    ConstructorExportProxy<T>
>;
