import type { ClassType, ConstructorType, Fn, FunctionTable, InstancePropertyTable, StaticPropertyTable } from '../../type';
import { type ClassEqualToDefault, type EqualToDefault, type PhantomData, isFunction } from '../../typeUtils';
import type { IClassDefineOptions } from './shared';
import type * as S from '../../serializers';
import type * as F from '../fn/master';
import * as FS from '../fn/masterShared';
import type * as I from './worker';
import type { ClassImpl } from './masterShared';
import type { MessageFactory } from '../message/declare';
import {
    EAction,
    type ICallClassInstanceFunctionData,
    type ICallClassStaticFunctionData,
    type IConstructData,
    type IFreePtrData,
} from '../action';
import { setProxyDefaultProperty } from '../fn/shared';

const $POINTER = Symbol('mater::pointer');

export type ExtractWorkerFunction<T extends Fn> = ReturnType<T> extends Promise<any>
    ? T
    : (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;

export type WorkerPropertyTable<T> = {
    [K in keyof T as T[K] extends Fn ? K : K extends symbol ? K : never]: T[K] extends Fn
        ? ExtractWorkerFunction<T[K]>
        : T[K];
};
type ExtractWorkerClass<T extends ClassType> = ClassEqualToDefault<
    WorkerPropertyTable<StaticPropertyTable<T>> &
        ConstructorType<T, ConstructorParameters<T>, WorkerPropertyTable<InstancePropertyTable<T>>>,
    T
>;

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
> = Omit<F.IRuntimeOptions<TransferableObject, TFn>, 'deserialize'>;
export type IFunctionOptions<TransferableObject, T extends ClassType> = IClassDefineOptions<
    IStaticOptions<TransferableObject, T>,
    IInstanceOptions<TransferableObject, T>,
    IConstructFunctionOption<TransferableObject, T>
>;
export interface IDefinedFunctionOptions<TransferableObject, T extends ClassType> {
    static?: Record<keyof FunctionTable<StaticPropertyTable<T>>, F.IRuntimeOptions<TransferableObject, Fn>>;
    instance?: Record<keyof FunctionTable<InstancePropertyTable<T>>, F.IRuntimeOptions<TransferableObject, Fn>>;
    construct?: IConstructFunctionOption<TransferableObject, T>;
}
export interface IRuntimeOptions<TransferableObject, T extends ClassType, TResolvedClassType extends ClassType = T>
    extends IFunctionOptions<TransferableObject, TResolvedClassType> {}

type ExtractFunctionTableOptionsExport<TFunctionTable extends Record<any, Fn>, TOptions> = {
    [K in keyof TFunctionTable]: K extends keyof TOptions
        ? TOptions[K] extends S.Serializer<any, any>
            ? F.ExtractModuleTableSerializerExport<TFunctionTable[K], TOptions[K]>
            : TFunctionTable[K]
        : TFunctionTable[K];
};
type ExtractClassStaticExport<
    T extends ClassType,
    TOptions extends IClassDefineOptions<any, any, any>,
    TStaticFunctionTable extends FunctionTable<StaticPropertyTable<T>> = FunctionTable<StaticPropertyTable<T>>,
> = EqualToDefault<ConstructorType<T> & ExtractFunctionTableOptionsExport<TStaticFunctionTable, TOptions['static']>, T>;

type ExtractClassInstanceExport<
    T extends ClassType,
    TOptions extends IClassDefineOptions<any, any, any>,
    TInstanceFunctionTable extends InstancePropertyTable<T> = InstancePropertyTable<T>,
> = EqualToDefault<
    StaticPropertyTable<T> &
        ConstructorType<
            T,
            ConstructorParameters<T>,
            ExtractFunctionTableOptionsExport<TInstanceFunctionTable, TOptions['instance']>
        >,
    T
>;

type ExtractModuleTableFunctionOptionsExport<T extends ClassType, TOptions> = TOptions extends IDefinedFunctionOptions<
    any,
    any
>
    ? ExtractClassStaticExport<ExtractClassInstanceExport<T, TOptions>, TOptions>
    : T;

type ExtractModuleTableOptionsExport<T extends ClassType, TOptions> = ExtractModuleTableFunctionOptionsExport<
    T,
    TOptions
>;
type DefinedFunctionSpawn<
    T extends I.ExposedModuleTable<any, any>,
    TOptions extends DefineClassSpawnOptions<T> = DefineClassSpawnOptions<T>,
> = {
    [K in keyof T]: ExtractWorkerClass<
        K extends keyof TOptions
            ? TOptions[K] extends IDefinedFunctionOptions<any, any>
                ? ExtractModuleTableOptionsExport<T[K]['ctor'], TOptions[K]>
                : T[K]['ctor']
            : T[K]['ctor']
    >;
};
export type DefineClassSpawnOptions<T extends I.ExposedModuleTable<any, any>> = T extends I.ExposedModuleTable<
    infer TransferableObject,
    any
>
    ? {
          readonly [K in keyof T]?: IRuntimeOptions<TransferableObject, T[K]['ctor']>;
      }
    : never;

export type CreateClassSpawn<
    TransferableObject,
    T extends Record<string, I.ExposedModuleTable<TransferableObject, any>>,
> = <
    Ns extends keyof T = keyof T,
    Table extends T[Ns] = T[Ns],
    TOptions extends DefineClassSpawnOptions<Table> = DefineClassSpawnOptions<Table>,
>(
    ns: Ns,
    options?: TOptions,
) => DefinedFunctionSpawn<Table, TOptions>;

interface IPointerInstance {
    [$POINTER]: Promise<I.IPointer<any>> | I.IPointer<any> | null;
}

const _createPointerSpawn = (
    msg: MessageFactory<any>,
    ns: string,
    pointer: I.IPointer<any> | Promise<I.IPointer<any>>,
    options: IRuntimeOptions<any, any>,
) => {
    const pointerInstance: IPointerInstance = {
        [$POINTER]: pointer,
    };
    setProxyDefaultProperty(pointerInstance);

    return new Proxy(pointerInstance as unknown as Record<string, Fn>, {
        get(target, p: string) {
            if (!(target as unknown as IPointerInstance)[$POINTER]) {
                throw new ReferenceError(`Instance(${ns}::unknown) has been freed. Property '${p}' is unreachable now`);
            }
            if (p in target) {
                return target[p];
            }
            const msgHandle = FS.createMsgHandle(
                msg,
                async (args) =>
                    ({
                        type: EAction.CALL,
                        fnName: p,
                        args,
                        ns: ns as string,
                        ptr: await pointer,
                    }) as ICallClassInstanceFunctionData<any>,
                options['instance']?.[p],
            );
            target[p] = msgHandle;
            return msgHandle;
        },
    });
};

const createCtorSpawn = (
    msg: MessageFactory<any>,
    ns: string,
    ctorKey: string,
    options: IRuntimeOptions<any, any> = {},
) => {
    const workerClassProxy = function () {} as unknown as Record<string, Fn>;
    setProxyDefaultProperty(workerClassProxy);
    return new Proxy(workerClassProxy, {
        // static function
        get(target, p: string) {
            if (p in target) {
                return target[p];
            }

            const msgHandle = FS.createMsgHandle(
                msg,
                (args) =>
                    ({
                        type: EAction.CALL,
                        fnName: p,
                        args,
                        ns: ns as string,
                        ctor: ctorKey,
                    }) as ICallClassStaticFunctionData<any>,
                options['static']?.[p],
            );
            target[p] = msgHandle;
            return msgHandle;
        },
        construct(_target, argArray) {
            let transferItems!: unknown[] | undefined;

            if (options.construct) {
                if (isFunction(options.construct.transfer)) {
                    transferItems = options.construct.transfer(argArray);
                }
                if (isFunction(options.construct.serialize)) {
                    argArray = options.construct.serialize(argArray) as any[];
                }
            }
            const actionData: IConstructData<any> = {
                type: EAction.CONSTRUCT,
                args: argArray,
                ns,
                ctor: ctorKey,
            };
            const pointer = msg(actionData, transferItems);
            return _createPointerSpawn(msg, ns, pointer as Promise<I.IPointer<any>>, options);
        },
    }) as ExtractWorkerClass<any>;
};

export const createClassSpawn: ClassImpl<any, CreateClassSpawn<any, any>> = (msg, context, ns, options = {}) => {
    const result = {} as DefinedFunctionSpawn<any>;
    setProxyDefaultProperty(result);
    context.GLOBAL_CLASS_OPTION_STORE[ns as string] = options;
    return new Proxy(result, {
        get(target, p: string) {
            if (p in target) {
                return target[p];
            }
            const ctorProxy = createCtorSpawn(msg, ns as string, p, options[p]);

            target[p] = ctorProxy;

            return ctorProxy;
        },
    });
};

export type Free<TransferableObject, T extends Record<string, I.ExposedModuleTable<TransferableObject, any>>> = <
    Ns extends keyof T = keyof T,
    Table extends T[Ns] = T[Ns],
    TKeys extends keyof Table = keyof Table,
    TCtor extends ExtractWorkerClass<Table[TKeys]['ctor']> = ExtractWorkerClass<Table[TKeys]['ctor']>,
    TInstance extends InstanceType<TCtor> = InstanceType<TCtor>,
>(
    instance: TInstance,
) => Promise<TInstance extends PhantomData<typeof I.$FREE_TYPE, infer PhantomType> ? PhantomType | false : boolean>;

export const free: ClassImpl<any, Free<any, any>> = async (msg, _context, instance) => {
    if ((instance as any)[$POINTER]) {
        const ptr = await (instance as IPointerInstance)[$POINTER]!;
        const actionData: IFreePtrData<any> = {
            type: EAction.FREE,
            ptr,
        };
        try {
            return await msg(actionData);
        } finally {
            (instance as any)[$POINTER] = null;
        }
    }
    return false;
};

export type CreatePointerSpawn<
    TransferableObject,
    T extends Record<string, I.ExposedModuleTable<TransferableObject, any>>,
> = <
    Ns extends keyof T = keyof T,
    Table extends T[Ns] = T[Ns],
    TKeys extends keyof Table = keyof Table,
    TCtor extends Table[TKeys]['ctor'] = Table[TKeys]['ctor'],
    TInstance extends InstanceType<TCtor> = InstanceType<TCtor>,
>(
    ns: Ns,
    ctorKey: TKeys,
    pointer: I.IPointer<TInstance>,
) => EqualToDefault<WorkerPropertyTable<TInstance>, TInstance>;
export const createPointerSpawn: ClassImpl<any, CreatePointerSpawn<any, any>> = (
    msg,
    context,
    ns,
    ctorKey,
    pointer,
) => {
    const options = context.GLOBAL_CLASS_OPTION_STORE[ns as string]?.[ctorKey as string] ?? {};

    return _createPointerSpawn(msg, ns as string, pointer, options);
};
