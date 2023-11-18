import type {
    ClassType,
    ConstructorType,
    Fn,
    FunctionTable,
    InstancePropertyTable,
    PromiseOrValue,
    StaticPropertyTable,
} from '../../type';
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

const $POINTER = Symbol('mater::pointer');

export type ExtractWorkerFunction<T extends Fn> = ReturnType<T> extends Promise<unknown>
    ? T
    : (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;

export type WorkerPropertyTable<T> = {
    [K in keyof T as T[K] extends Fn ? K : K extends symbol ? K : never]: T[K] extends Fn
        ? ExtractWorkerFunction<T[K]>
        : T[K];
};
type ExtractWorkerClass<T extends ClassType = ClassType> = ClassEqualToDefault<
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
export interface IDefinedFunctionOptions<TransferableObject = unknown, T extends ClassType = ClassType> {
    static?: Record<keyof FunctionTable<StaticPropertyTable<T>>, F.IRuntimeOptions<TransferableObject, Fn>>;
    instance?: Record<keyof FunctionTable<InstancePropertyTable<T>>, F.IRuntimeOptions<TransferableObject, Fn>>;
    construct?: IConstructFunctionOption<TransferableObject, T>;
}
export interface IRuntimeOptions<
    TransferableObject = unknown,
    T extends ClassType = ClassType,
    TResolvedClassType extends ClassType = T,
> extends IFunctionOptions<TransferableObject, TResolvedClassType> {}

type ExtractFunctionTableOptionsExport<TFunctionTable extends Record<string | number | symbol, Fn>, TOptions> = {
    [K in keyof TFunctionTable]: K extends keyof TOptions
        ? TOptions[K] extends S.Serializer
            ? F.ExtractModuleTableSerializerExport<TFunctionTable[K], TOptions[K]>
            : TFunctionTable[K]
        : TFunctionTable[K];
};
type ExtractClassStaticExport<
    T extends ClassType,
    TOptions extends IClassDefineOptions,
    TStaticFunctionTable extends FunctionTable<StaticPropertyTable<T>> = FunctionTable<StaticPropertyTable<T>>,
> = EqualToDefault<ConstructorType<T> & ExtractFunctionTableOptionsExport<TStaticFunctionTable, TOptions['static']>, T>;

type ExtractClassInstanceExport<
    T extends ClassType,
    TOptions extends IClassDefineOptions,
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

type ExtractModuleTableFunctionOptionsExport<T extends ClassType, TOptions> = TOptions extends IDefinedFunctionOptions
    ? ExtractClassStaticExport<ExtractClassInstanceExport<T, TOptions>, TOptions>
    : T;

type ExtractModuleTableOptionsExport<T extends ClassType, TOptions> = ExtractModuleTableFunctionOptionsExport<
    T,
    TOptions
>;
type DefinedFunctionSpawn<
    T extends I.ExposedModuleTable = I.ExposedModuleTable,
    TOptions extends DefineClassSpawnOptions<T> = DefineClassSpawnOptions<T>,
> = {
    [K in keyof T]: ExtractWorkerClass<
        K extends keyof TOptions
            ? TOptions[K] extends IDefinedFunctionOptions
                ? ExtractModuleTableOptionsExport<T[K]['ctor'], TOptions[K]>
                : T[K]['ctor']
            : T[K]['ctor']
    >;
};
export type DefineClassSpawnOptions<T extends I.ExposedModuleTable = I.ExposedModuleTable> = T extends I.ExposedModuleTable<
    infer TransferableObject
>
    ? {
          readonly [K in keyof T]?: IRuntimeOptions<TransferableObject, T[K]['ctor']>;
      }
    : never;

export type CreateClassSpawn<
    TransferableObject = unknown,
    T extends Record<string, I.ExposedModuleTable<TransferableObject>> = Record<
        string,
        I.ExposedModuleTable<TransferableObject>
    >,
> = <
    Ns extends keyof T = keyof T,
    Table extends T[Ns] = T[Ns],
    TOptions extends DefineClassSpawnOptions<Table> = DefineClassSpawnOptions<Table>,
>(
    ns: Ns,
    options?: TOptions,
) => DefinedFunctionSpawn<Table, TOptions>;

interface IPointerInstance {
    [$POINTER]: Promise<I.IPointer> | I.IPointer | null;
}

const _createPointerSpawn = (
    msg: MessageFactory,
    ns: string,
    pointer: I.IPointer | Promise<I.IPointer>,
    options: IRuntimeOptions,
) => {
    const pointerInstance: IPointerInstance = {
        [$POINTER]: pointer,
    };
    FS.setProxyDefaultProperty(pointerInstance);

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
                    }) as ICallClassInstanceFunctionData,
                options['instance']?.[p],
            );
            target[p] = msgHandle;
            return msgHandle;
        },
    });
};

const createCtorSpawn = (msg: MessageFactory, ns: string, ctorKey: string, options: IRuntimeOptions = {}) => {
    const workerClassProxy = function () {} as unknown as Record<string, Fn> & ClassType;
    FS.setProxyDefaultProperty(workerClassProxy);
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
                    }) as ICallClassStaticFunctionData,
                options['static']?.[p as keyof IRuntimeOptions['static']],
            );
            target[p] = msgHandle;
            return msgHandle;
        },
        construct(_target, argArray) {
            let transferItems: unknown[] | undefined = undefined;
            let pointer!: Promise<I.IPointer>;
            const createPointer = async (argArray: PromiseOrValue<unknown[]>): Promise<I.IPointer> => {
                const actionData: IConstructData = {
                    type: EAction.CONSTRUCT,
                    args: await argArray,
                    ns,
                    ctor: ctorKey,
                };
                return msg(actionData, transferItems);
            };
            if (options.construct) {
                if (isFunction(options.construct.transfer)) {
                    transferItems = options.construct.transfer(argArray);
                }
                if (isFunction(options.construct.serialize)) {
                    pointer = createPointer(options.construct.serialize(argArray));
                }
            }
            if (!pointer) {
                pointer = createPointer(argArray);
            }
            return _createPointerSpawn(msg, ns, pointer as Promise<I.IPointer>, options);
        },
    }) as ExtractWorkerClass;
};

export const createClassSpawn: ClassImpl<unknown, CreateClassSpawn> = (msg, context, ns, options = {}) => {
    const result = {} as DefinedFunctionSpawn;
    FS.setProxyDefaultProperty(result);
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

export type Free<
    TransferableObject = unknown,
    T extends Record<string, I.ExposedModuleTable<TransferableObject>> = Record<
        string,
        I.ExposedModuleTable<TransferableObject>
    >,
> = <
    Ns extends keyof T = keyof T,
    Table extends T[Ns] = T[Ns],
    TKeys extends keyof Table = keyof Table,
    TCtor extends ExtractWorkerClass<Table[TKeys]['ctor']> = ExtractWorkerClass<Table[TKeys]['ctor']>,
    TInstance extends InstanceType<TCtor> = InstanceType<TCtor>,
>(
    instance: TInstance,
) => Promise<TInstance extends PhantomData<typeof I.$FREE_TYPE, infer PhantomType> ? PhantomType | false : boolean>;

export const free: ClassImpl<unknown, Free> = async (msg, _context, instance) => {
    if ((instance as IPointerInstance)[$POINTER]) {
        const ptr = await (instance as IPointerInstance)[$POINTER]!;
        const actionData: IFreePtrData = {
            type: EAction.FREE,
            ptr,
        };
        try {
            return await msg(actionData);
        } finally {
            (instance as IPointerInstance)[$POINTER] = null;
        }
    }
    return false;
};

export type CreatePointerSpawn<
    TransferableObject = unknown,
    T extends Record<string, I.ExposedModuleTable<TransferableObject>> = Record<
        string,
        I.ExposedModuleTable<TransferableObject>
    >,
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
export const createPointerSpawn: ClassImpl<unknown, CreatePointerSpawn> = (msg, context, ns, ctorKey, pointer) => {
    const options = context.GLOBAL_CLASS_OPTION_STORE[ns as string]?.[ctorKey as string] ?? {};

    return _createPointerSpawn(msg, ns as string, pointer, options);
};
