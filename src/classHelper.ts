import type { ClassType, ConstructorTypeCustom, StaticPropertyTable } from './type';
import type { Equal, EqualToDefault, Phantom } from './typeUtils';

export declare const $ORIGIN_TYPE: unique symbol;
type AddOriginType<T, TOrigin> = Phantom<T, typeof $ORIGIN_TYPE, TOrigin>;
export type ExtraOriginType<T> = T extends AddOriginType<infer _, infer TOrigin> ? TOrigin : T;

type ConstructorHelper<
    T extends ClassType,
    TConstructorParameters extends unknown[],
    TInstancePropertyTable,
> = ConstructorTypeCustom<
    Equal<TConstructorParameters, unknown[]> extends true ? ConstructorParameters<T> : TConstructorParameters,
    Equal<TInstancePropertyTable, unknown> extends true
        ? InstanceType<T>
        : Phantom<TInstancePropertyTable, typeof $ORIGIN_TYPE, T>
>;

export type ClassHelper<
    T extends ClassType,
    TStaticPropertyTable = unknown,
    TConstructorParameters extends unknown[] = unknown[],
    TInstancePropertyTable = unknown,
> = Equal<TStaticPropertyTable, unknown> extends true
    ? Equal<TConstructorParameters, unknown[]> extends true
        ? Equal<TInstancePropertyTable, unknown> extends true
            ? T
            : AddOriginType<
                  ConstructorTypeCustom<ConstructorParameters<T>, AddOriginType<TInstancePropertyTable, T>>,
                  T
              >
        : AddOriginType<
              ConstructorTypeCustom<
                  TConstructorParameters,
                  Equal<TInstancePropertyTable, unknown> extends true
                      ? InstanceType<T>
                      : Phantom<TInstancePropertyTable, typeof $ORIGIN_TYPE, T>
              >,
              T
          >
    : AddOriginType<ConstructorHelper<T, TConstructorParameters, TInstancePropertyTable> & TStaticPropertyTable, T>;

export type WithDefaultClassHelper<T extends ClassType> = T extends ClassHelper<
    infer P,
    infer TStaticPropertyTable,
    infer TConstructorParameters,
    infer TInstancePropertyTable
>
    ? ClassHelper<
          P,
          TStaticPropertyTable,
          EqualToDefault<TConstructorParameters, ConstructorParameters<P>, unknown>,
          EqualToDefault<TInstancePropertyTable, InstanceType<P>, unknown>
      >
    : ClassHelper<T, NonNullable<StaticPropertyTable<T>>, ConstructorParameters<T>, InstanceType<T>>;
