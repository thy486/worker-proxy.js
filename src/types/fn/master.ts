import * as S from '../../serializers';
import type { Fn } from '../../type';
import type { Equal } from '../../typeUtils';
import { EAction, type ICallPlainFunctionData } from '../action';
import type { TransferableOptions } from '../../transferable';
import type * as I from './worker';
import { type FunctionImpl, createMsgHandle } from './masterShared';
import { setProxyDefaultProperty } from './shared';

export type ExtractWorkerFunction<T extends Fn> = ReturnType<T> extends Promise<any>
    ? T
    : (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
export interface IRuntimeOptions<
    TransferableObject,
    T extends Fn,
    Args = Parameters<T>,
    Result = Awaited<ReturnType<T>>,
> extends TransferableOptions<TransferableObject, Args>,
        S.Serializer<Result, Args, unknown, Args> {}

export type ExtractModuleTableSerializerExport<
    TFn extends Fn,
    S extends S.Serializer<any, any>,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TResult, TArgs> = S.WithDefault<S, TResult, TArgs>,
> = TDefaultSerializer extends S.Serializer<infer MsgIn, infer MsgOut, infer DeMegIn, infer _>
    ? Equal<DeMegIn, MsgIn> extends true
        ? TFn
        : MsgOut extends any[]
          ? (...args: MsgOut) => Promise<DeMegIn>
          : // Args will always be array
            TFn
    : TFn;
type DefinedFunctionSpawn<
    T extends I.ExposedModuleTable<any, any>,
    TOptions extends DefineFunctionSpawnOptions<T> = DefineFunctionSpawnOptions<T>,
> = {
    [K in keyof T]: ExtractWorkerFunction<
        K extends keyof TOptions
            ? TOptions[K] extends S.Serializer<any, any>
                ? ExtractModuleTableSerializerExport<T[K]['value'], TOptions[K]>
                : T[K]['value']
            : T[K]['value']
    >;
};

export type DefineFunctionSpawnOptions<T extends I.ExposedModuleTable<any, any>> = T extends I.ExposedModuleTable<
    infer TransferableObject,
    any
>
    ? {
          readonly [K in keyof T]?: IRuntimeOptions<TransferableObject, T[K]['value']>;
      }
    : never;

export type CreateFunctionSpawn<
    TransferableObject,
    T extends Record<string, I.ExposedModuleTable<TransferableObject, any>>,
> = <
    Ns extends keyof T = keyof T,
    Table extends T[Ns] = T[Ns],
    TOptions extends DefineFunctionSpawnOptions<Table> = DefineFunctionSpawnOptions<Table>,
>(
    ns: Ns,
    options?: TOptions,
) => DefinedFunctionSpawn<Table, TOptions>;

export const createFunctionSpawn: FunctionImpl<any, CreateFunctionSpawn<any, any>> = (msg, ns, options = {}) => {
    const result = {} as DefinedFunctionSpawn<any>;
    setProxyDefaultProperty(result);
    return new Proxy(result, {
        get: (target, p) => {
            const key = p as any;
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
                    }) as ICallPlainFunctionData<any>,
                options[p as string],
            );
            target[key] = msgHandle;
            return msgHandle;
        },
    });
};
