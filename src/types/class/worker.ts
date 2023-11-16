import type {
    ClassType,
    ConstructorFunctionType,
    ConstructorType,
    ConstructorTypeCustom,
    Fn,
    FunctionTable,
    FunctionToConstructorType,
    InstancePropertyTable,
    StaticPropertyTable,
} from '../../type';
import type * as S from '../../serializers';
import {
    type Equal,
    type PhantomData,
    type PhantomType,
    isFunction,
    type ClassEqualToDefault,
} from '../../typeUtils';
import type * as F from '../fn/worker';
import * as FS from '../fn/workerShared';
import type * as CS from './workerShared';
import type { IClassDefineOptions } from './shared';

const $CLASS_DEFINE = Symbol('class::define');
export declare const $FREE_TYPE: unique symbol;
export declare const $POINTER_TYPE: unique symbol;
let scopeId = 0;
const scopes = new Map<number, PtrScope<any, any>>();
const registerTypeMap: WeakMap<object, number> = new WeakMap();

export interface IPointer<T> {
    [$POINTER_TYPE]: T;
    rawPtr: number;
    rawType: number;
}
interface IFreeOptions<T extends ClassType, TCallbackType = unknown> {
    onFree?: (instance: InstanceType<T>) => TCallbackType;
}
type IStaticOptions<
    TransferableObject,
    T extends ClassType,
    TStaticFunctionTable extends FunctionTable<StaticPropertyTable<T>> = FunctionTable<StaticPropertyTable<T>>,
> = {
    [K in keyof TStaticFunctionTable]?: F.IRuntimeOptions<TransferableObject, TStaticFunctionTable[K]>;
};
type IInstanceOptions<
    TransferableObject,
    T extends ClassType,
    TInstanceFunctionTable extends FunctionTable<InstancePropertyTable<T>> = FunctionTable<InstancePropertyTable<T>>,
> = {
    [K in keyof TInstanceFunctionTable]?: F.IRuntimeOptions<TransferableObject, TInstanceFunctionTable[K]>;
};
export type IConstructFunctionOption<
    TransferableObject,
    T extends ClassType,
    TFn extends Fn = (...args: ConstructorParameters<T>) => InstanceType<T>,
> = Omit<F.IRuntimeOptions<TransferableObject, TFn>, 'serialize' | 'transfer'>;

export type IFunctionOptions<TransferableObject, T extends ClassType> = IClassDefineOptions<
    IStaticOptions<TransferableObject, T>,
    IInstanceOptions<TransferableObject, T>,
    IConstructFunctionOption<TransferableObject, T>
>;
export type IDefinedFunctionOptions<TransferableObject, T extends ClassType> = IClassDefineOptions<
    Record<keyof FunctionTable<StaticPropertyTable<T>>, F.IRuntimeOptions<TransferableObject, Fn>>,
    Record<keyof FunctionTable<InstancePropertyTable<T>>, F.IRuntimeOptions<TransferableObject, Fn>>,
    F.IRuntimeOptions<TransferableObject, Fn>
>;
export interface IRuntimeOptions<TransferableObject, T extends ClassType, TResolvedClassType extends ClassType = T>
    extends IFreeOptions<TResolvedClassType>,
        IFunctionOptions<TransferableObject, TResolvedClassType> {}

export interface IDefinedRuntimeOptions<TransferableObject, T extends ClassType>
    extends IFreeOptions<T>,
        IDefinedFunctionOptions<TransferableObject, T> {}

export interface IDefinedModuleTableExport<
    TransferableObject,
    T extends ClassType,
    TOptions extends IRuntimeOptions<TransferableObject, any, any> = IRuntimeOptions<TransferableObject, T>,
> {
    [$CLASS_DEFINE]: true;
    ctor: T;
    options?: TOptions;
}

interface IResolvedDefinedModuleTableExport<
    TransferableObject,
    T extends ClassType,
    TOptions extends IDefinedRuntimeOptions<TransferableObject, any>,
> {
    [$CLASS_DEFINE]: true;
    ctor: T;
    options?: TOptions;
}

export type ModuleTableExport<TransferableObject, T extends ClassType> =
    | T
    | IDefinedModuleTableExport<TransferableObject, T, IRuntimeOptions<TransferableObject, T>>;

export type DefineModuleTableExport<TransferableObject> = <
    T extends ClassType,
    TOptions extends IRuntimeOptions<TransferableObject, T>,
>(
    ctor: T,
    options?: TOptions,
) => IDefinedModuleTableExport<TransferableObject, T, TOptions>;

type MergeInstanceType<T extends ClassType, MergeValue> = T & ConstructorTypeCustom<any, MergeValue>;
type ExtractModuleTableFreeOptionsExport<T extends ClassType, TOptions> = TOptions extends IFreeOptions<
    any,
    infer Result
>
    ? Equal<Result, unknown> extends true
        ? T
        : MergeInstanceType<T, PhantomType<InstanceType<T>, typeof $FREE_TYPE, Result>>
    : T;

type ExtractFunctionTableItemOptionExport<TProperty extends Fn, TOption> = TOption extends S.Serializer<any, any>
    ? F.ExtractModuleTableSerializerExport<TProperty, TOption>
    : TProperty;
type ExtractFunctionTableOptionsExport<TPropertyTable, TOptions> = {
    [K in keyof TPropertyTable]: TPropertyTable[K] extends Fn
        ? K extends keyof TOptions
            ? ExtractFunctionTableItemOptionExport<TPropertyTable[K], TOptions[K]>
            : TPropertyTable[K]
        : TPropertyTable[K];
};
type ExtractClassStaticExport<
    T extends ClassType,
    TOptions extends IClassDefineOptions<any, any, any>,
    TStaticPropertyTable extends StaticPropertyTable<T> = StaticPropertyTable<T>,
> = ClassEqualToDefault<
    ConstructorType<T> & ExtractFunctionTableOptionsExport<TStaticPropertyTable, TOptions['static']>,
    T
>;

type ExtractClassInstanceExport<
    T extends ClassType,
    TOptions extends IClassDefineOptions<any, any, any>,
    TInstanceFunctionTable extends InstancePropertyTable<T> = InstancePropertyTable<T>,
> = ClassEqualToDefault<
    StaticPropertyTable<T> &
        ConstructorType<
            T,
            ConstructorParameters<T>,
            ExtractFunctionTableOptionsExport<TInstanceFunctionTable, TOptions['instance']>
        >,
    T
>;

type ExtractClassConstructExport<
    T extends ClassType,
    TOptions extends IClassDefineOptions<any, any, any>,
    TConstructFunction extends ConstructorFunctionType<T> = ConstructorFunctionType<T>,
> = ClassEqualToDefault<
    StaticPropertyTable<T> &
        FunctionToConstructorType<ExtractFunctionTableItemOptionExport<TConstructFunction, TOptions['construct']>>,
    T
>;

type ExtractModuleTableFunctionOptionsExport<T extends ClassType, TOptions> = TOptions extends IDefinedFunctionOptions<
    any,
    any
>
    ? ExtractClassStaticExport<ExtractClassInstanceExport<ExtractClassConstructExport<T, TOptions>, TOptions>, TOptions>
    : T;

type ExtractModuleTableOptionsExport<T extends ClassType, TOptions> = ExtractModuleTableFreeOptionsExport<
    ExtractModuleTableFunctionOptionsExport<T, TOptions>,
    TOptions
>;

export interface ExposedModuleTableItem<
    TransferableObject,
    T extends ClassType = ClassType,
    TOptions extends IDefinedRuntimeOptions<any, any> = IDefinedRuntimeOptions<any, any>,
> {
    ctor: T;
    scope: PtrScope<TransferableObject, T, TOptions>;
}

export type ExposedModuleTable<
    TransferableObject,
    T extends Record<string, ModuleTableExport<TransferableObject, ClassType>> = Record<
        string,
        ModuleTableExport<TransferableObject, ClassType>
    >,
> = {
    [K in keyof T]: T[K] extends ModuleTableExport<TransferableObject, infer TClassType>
        ? T[K] extends IResolvedDefinedModuleTableExport<TransferableObject, any, infer TOptions>
            ? ExposedModuleTableItem<
                  TransferableObject,
                  ExtractModuleTableOptionsExport<TClassType, TOptions>,
                  TOptions
              >
            : ExposedModuleTableItem<TransferableObject, TClassType, NonNullable<unknown>>
        : never;
};

export type ExposeModuleTable<TransferableObject> = <T extends Record<string, any>>(
    moduleTable: T,
) => ExposedModuleTable<TransferableObject, T>;

class PtrScope<
    TransferableObject,
    T extends ClassType,
    TOptions extends IClassDefineOptions<any, any, any> = IRuntimeOptions<TransferableObject, T>,
    TProxy = CS.ExtractProxyFromOptions<TransferableObject, T, TOptions>,
    TInstance = InstanceType<T>,
> {
    private _instancePtr: number = 0;

    private readonly _inner: Map<number, TInstance> = new Map();

    private readonly _freed: number[] = [];

    private readonly _onFree: IFreeOptions<T>['onFree'];

    private readonly _proxy: CS.ClassExportProxy<TransferableObject, T> = {};

    public get proxy(): TProxy {
        return this._proxy as TProxy;
    }

    public constructor(options: TOptions = {} as TOptions) {
        if (isFunction((options as IRuntimeOptions<TransferableObject, T>).onFree)) {
            this._onFree = (options as IRuntimeOptions<TransferableObject, T>).onFree;
        }
        if (options.static) {
            this._proxy.static = FS.createProxyTable(options.static) as CS.ClassStaticExportProxy<
                TransferableObject,
                T,
                FunctionTable<StaticPropertyTable<T>>
            >;
        }
        if (options.instance) {
            this._proxy.instance = FS.createProxyTable(options.instance as any) as CS.ClassInstanceExportProxy<
                TransferableObject,
                T,
                FunctionTable<InstancePropertyTable<T>>
            >;
        }
        if (options.construct && isFunction(options.construct.deserialize)) {
            this._proxy.construct = options.construct!.deserialize;
        }
    }

    public allocPtr(instance: TInstance): number {
        let ptr: number;
        if (this._freed.length > 0) {
            ptr = this._freed.pop()!;
        } else {
            ptr = this._instancePtr++;
        }
        this._inner.set(ptr, instance);
        return ptr;
    }

    public fromPtr(ptr: number): TInstance | null {
        const ret = this._inner.get(ptr);
        if (!ret) {
            return null;
        }
        return ret;
    }

    public freePtr(
        ptr: number,
    ): InstanceType<T> extends PhantomData<typeof $FREE_TYPE, infer PhantomType>
        ? Promise<PhantomType | false>
        : boolean {
        const instance = this._inner.get(ptr);
        const rmRet = this._inner.delete(ptr);
        if (instance) {
            this._freed.push(ptr);
            if (this._onFree) {
                return this._onFree(instance as InstanceType<T>) as any;
            }
        }
        return rmRet as any;
    }
}

const register = <T extends ClassType>(ty: T): number => {
    const ret = scopeId++;
    registerTypeMap.set(ty, ret);
    return ret;
};

export const getTypeId = <T extends ClassType>(ty: T): number | null => {
    if (registerTypeMap.has(ty)) {
        return registerTypeMap.get(ty)!;
    }
    return null;
};

export const getScopeById = <T extends ClassType>(typeId: number): PtrScope<T, any> | null => {
    const instance = scopes.get(typeId);
    if (instance) {
        return instance;
    }
    return null;
};

export const createPointer = <T extends ClassType, TInstance extends InstanceType<T> = InstanceType<T>>(
    ctor: T,
    instance: TInstance,
): IPointer<TInstance> => {
    const typeId = getTypeId(ctor);
    if (typeId === null) {
        throw new Error(`Type of class ${ctor.name} was not been registered!`);
    }
    const scope = getScopeById(typeId);
    if (scope === null) {
        throw new Error(`Scope of class ${ctor.name} was not been registered!`);
    }
    return {
        rawType: typeId,
        rawPtr: scope.allocPtr(instance),
    } as IPointer<TInstance>;
};

export const fromPointer = <
    T extends ClassType,
    TInstance extends InstanceType<T> = InstanceType<T>,
    TPointer extends IPointer<TInstance> = IPointer<TInstance>,
>(
        value: TPointer,
    ): TInstance => {
    const scope = getScopeById(value.rawType);
    if (scope === null) {
        throw new ReferenceError(`Pointer type(${value.rawType}) is not exposed.`);
    }
    const instance = scope.fromPtr(value.rawPtr);
    if (instance === null) {
        throw new ReferenceError(`Pointer is not existed.`);
    }
    return instance;
};

export const define: DefineModuleTableExport<any> = (ctor, options) => ({
    [$CLASS_DEFINE]: true,
    ctor,
    options,
});

export const expose = ((moduleTable: Record<string, any>) => {
    const result: ExposedModuleTable<any, any> = {};
    for (const key in moduleTable) {
        const exportItem = moduleTable[key];
        let classCtor: ClassType;
        let classOptions!: IRuntimeOptions<any, ClassType> | undefined;
        if (typeof exportItem === 'function') {
            classCtor = exportItem;
        } else {
            const { ctor, options } = exportItem;
            classCtor = ctor;
            classOptions = options;
        }
        // Avoid double register
        if (registerTypeMap.has(classCtor)) {
            const typeId = registerTypeMap.get(classCtor)!;
            console.warn(
                `Class(${classCtor.name}) registered multiple times will only be in the same scope(id: ${typeId}).`,
            );
            result[key] = {
                ctor: classCtor,
                scope: scopes.get(typeId)! as any,
            };
            continue;
        }
        const scopedId = register(classCtor);
        const classScope = new PtrScope(classOptions);
        scopes.set(scopedId, classScope);
        result[key] = {
            ctor: classCtor,
            scope: classScope as any,
        };
    }

    return result;
}) as ExposeModuleTable<any>;
