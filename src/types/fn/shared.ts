import { Fn } from '../../type';
import type * as S from '../../serializers';
import { Equal } from '../../typeUtils';

export interface IFunctionResultBySerialize<T extends Fn, Args = Parameters<T>, Result = Awaited<ReturnType<T>>>
    extends S.Serializer<Args, Result, Args, unknown> {}
/**
 * function result is serialize value
 */
export type ExtractFunctionResultFnBySerialize<
    TFn extends Fn,
    S,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TArgs, TResult> = S.WithDefault<S, TArgs, TResult>,
> = TDefaultSerializer extends S.Serializer<infer DeSerMsgIn, infer SerMsgIn, infer _, infer SerializedMsgOut>
    ? // the type of serialize result is not changed
      Equal<SerializedMsgOut, SerMsgIn> extends true
        ? TFn
        : DeSerMsgIn extends unknown[]
          ? (...args: DeSerMsgIn) => Promise<SerializedMsgOut>
          : TFn
    : TFn;

export interface IFunctionArgsBySerialize<T extends Fn, Args = Parameters<T>, Result = Awaited<ReturnType<T>>>
    extends S.Serializer<Result, Args, Result, unknown> {}
/**
 * function args is serialize value
 */
export type ExtractFunctionArgsFnBySerialize<
    TFn extends Fn,
    S extends S.Serializer<never, never>,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TResult, TArgs> = S.WithDefault<S, TResult, TArgs>,
> = TDefaultSerializer extends S.Serializer<infer DeSerMsgIn, infer SerMsgIn, infer _, infer SerializedMsgOut>
    ? // the type of serialize args is not changed
      Equal<SerializedMsgOut, SerMsgIn> extends true
        ? TFn
        : SerializedMsgOut extends unknown[]
          ? (...args: SerializedMsgOut) => Promise<DeSerMsgIn>
          : // Args will always be array
            TFn
    : TFn;
export type ExtractFunctionArgsBySerialize<
    TFn extends Fn,
    S extends S.Serializer<never, never>,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TResult, TArgs> = S.WithDefault<S, TResult, TArgs>,
> = TDefaultSerializer extends S.Serializer<infer _, infer SerMsgIn, infer _, infer SerializedMsgOut>
    ? // the type of serialize args is not changed
      Equal<SerializedMsgOut, SerMsgIn> extends true
        ? SerMsgIn
        : SerializedMsgOut
    : TArgs;
export interface IFunctionResultByDeserialize<T extends Fn, Args = Parameters<T>, Result = Awaited<ReturnType<T>>>
    extends S.Serializer<Result, Args, unknown, Args> {}
/**
 * function result is deserialize value
 */
export type ExtractFunctionResultFnByDeserialize<
    TFn extends Fn,
    S extends S.Serializer<never, never>,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TResult, TArgs> = S.WithDefault<S, TResult, TArgs>,
> = TDefaultSerializer extends S.Serializer<infer DeSerMsgIn, infer SerMsgIn, infer DeserializedMsgOut, infer _>
    ? // the type of deserialize result is not changed
      Equal<DeserializedMsgOut, DeSerMsgIn> extends true
        ? TFn
        : SerMsgIn extends unknown[]
          ? (...args: SerMsgIn) => Promise<DeserializedMsgOut>
          : // Args will always be array
            TFn
    : TFn;
export interface IFunctionArgsByDeserialize<T extends Fn, Args = Parameters<T>, Result = Awaited<ReturnType<T>>>
    extends S.Serializer<Args, Result, unknown, Result> {}
/**
 * function args is deserialize value
 */
export type ExtractFunctionArgsFnByDeSerialize<
    TFn extends Fn,
    S extends S.Serializer<never, never>,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TArgs, TResult> = S.WithDefault<S, TArgs, TResult>,
> = TDefaultSerializer extends S.Serializer<infer DeSerMsgIn, infer _, infer DeserializedMsgOut, infer _>
    ? // the type of deserialize args is not changed
      Equal<DeserializedMsgOut, DeSerMsgIn> extends true
        ? DeSerMsgIn
        : DeserializedMsgOut
    : TArgs;

export type ExtractFunctionArgsByDeSerialize<
    TFn extends Fn,
    S extends S.Serializer<never, never>,
    TArgs extends Parameters<TFn> = Parameters<TFn>,
    TReturnType extends ReturnType<TFn> = ReturnType<TFn>,
    TResult extends Awaited<TReturnType> = Awaited<TReturnType>,
    TDefaultSerializer extends S.WithDefault<S, TArgs, TResult> = S.WithDefault<S, TArgs, TResult>,
> = TDefaultSerializer extends S.Serializer<infer DeSerMsgIn, infer SerMsgIn, infer DeserializedMsgOut, infer _>
    ? // the type of deserialize args is not changed
      Equal<DeserializedMsgOut, DeSerMsgIn> extends true
        ? TFn
        : DeserializedMsgOut extends unknown[]
          ? (...args: DeserializedMsgOut) => Promise<SerMsgIn>
          : // Args will always be array
            TFn
    : TFn;