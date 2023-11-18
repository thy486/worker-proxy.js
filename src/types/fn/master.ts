import * as S from '../../serializers';
import type { Fn } from '../../type';
import type { Equal } from '../../typeUtils';
import { EAction, type ICallPlainFunctionData } from '../action';
import type { ITransferableOptions } from '../../transferable';
import type * as I from './worker';
import { type FunctionImpl, createMsgHandle, setProxyDefaultProperty } from './masterShared';

export type ExtractWorkerFunction<T extends Fn = Fn> = ReturnType<T> extends Promise<unknown>
    ? T
    : (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
export interface IRuntimeOptions<
    TransferableObject,
    T extends Fn,
    Args = Parameters<T>,
    Result = Awaited<ReturnType<T>>,
> extends ITransferableOptions<TransferableObject, Args>,
        S.Serializer<Result, Args, unknown, Args> {}

export type ExtractModuleTableSerializerExport<
    TFn extends Fn,
    S extends S.Serializer,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TResult, TArgs> = S.WithDefault<S, TResult, TArgs>,
> = TDefaultSerializer extends S.Serializer<infer MsgIn, infer MsgOut, infer DeMegIn, infer _>
    ? Equal<DeMegIn, MsgIn> extends true
        ? TFn
        : MsgOut extends unknown[]
          ? (...args: MsgOut) => Promise<DeMegIn>
          : // Args will always be array
            TFn
    : TFn;
type DefinedFunctionSpawn<
    T extends I.ExposedModuleTable = I.ExposedModuleTable,
    TOptions extends DefineFunctionSpawnOptions<T> = DefineFunctionSpawnOptions<T>,
> = {
    [K in keyof T]: ExtractWorkerFunction<
        K extends keyof TOptions
            ? TOptions[K] extends S.Serializer
                ? ExtractModuleTableSerializerExport<T[K]['value'], TOptions[K]>
                : T[K]['value']
            : T[K]['value']
    >;
};

export type DefineFunctionSpawnOptions<T extends I.ExposedModuleTable> = T extends I.ExposedModuleTable<
    infer TransferableObject
>
    ? {
          readonly [K in keyof T]?: IRuntimeOptions<TransferableObject, T[K]['value']>;
      }
    : never;

export type CreateFunctionSpawn<
    TransferableObject = unknown,
    T extends Record<string, I.ExposedModuleTable<TransferableObject>> = Record<
        string,
        I.ExposedModuleTable<TransferableObject>
    >,
> = <
    Ns extends keyof T = keyof T,
    Table extends T[Ns] = T[Ns],
    TOptions extends DefineFunctionSpawnOptions<Table> = DefineFunctionSpawnOptions<Table>,
>(
    ns: Ns,
    options?: TOptions,
) => DefinedFunctionSpawn<Table, TOptions>;

export const createFunctionSpawn: FunctionImpl<unknown, CreateFunctionSpawn> = (msg, ns, options) => {
    const result = {} as DefinedFunctionSpawn;
    setProxyDefaultProperty(result);
    return new Proxy(result, {
        get: (target, p) => {
            const key = p as string;
            if (target[key]) {
                return target[key];
            }

            const msgHandle = createMsgHandle(
                msg,
                (args) =>
                    ({
                        type: EAction.CALL,
                        fnName: key,
                        args,
                        ns: ns as string,
                    }) as ICallPlainFunctionData,
                (options ?? {})[p as string],
            );
            target[key] = msgHandle as never;
            return msgHandle;
        },
    });
};
