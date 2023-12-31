import type { ClassType, ConstructorType, Fn, StaticPropertyTable } from './type';

export type Prettify<T> = NonNullable<{
    [K in keyof T as T[K] extends never ? never : K]: T[K];
}>;

export type UnshiftArgs<T extends Fn, TArgs extends unknown[]> = (
    ...args: [...TArgs, ...args: Parameters<T>]
) => ReturnType<T>;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type EqualToDefault<Value, Default, EqualValue = Default> = Equal<Value, EqualValue> extends true
    ? Default
    : Value;

export type ClassEqual<X extends ClassType, Y extends ClassType> = Equal<
    StaticPropertyTable<X>,
    StaticPropertyTable<Y>
> extends true
    ? Equal<InstanceType<X>, InstanceType<Y>> extends true
        ? Equal<ConstructorType<X>, ConstructorType<Y>> extends true
            ? true
            : false
        : false
    : false;

export type ClassEqualToDefault<T extends ClassType, D extends ClassType> = ClassEqual<T, D> extends true ? D : T;

export type PhantomData<Key extends symbol, PhantomType> = {
    [PK in Key]: PhantomType;
};
export type Phantom<T, PhantomKey extends symbol, PhantomType> = T & PhantomData<PhantomKey, PhantomType>;
export type ExtractPhantomData<T, PhantomKey extends symbol, Default = never> = T extends PhantomData<
    PhantomKey,
    infer PhantomType
>
    ? PhantomType
    : Default;

export const isFunction = (value: unknown): value is Fn => {
    return typeof value === 'function';
};

export const isPlainObject = (value: unknown): value is object =>
    Object.prototype.toString.call(value) !== '[object Object]';

export const mergeVoidFunction =
    <T extends () => void>(a: T, b: T): (() => void) =>
    (): void => {
        a();
        b();
    };
export type CreateTuple<T extends unknown[]> = (...args: T) => T;
export type MergedTuple<T extends unknown[], T2 extends unknown[], F = CreateTuple<T>> = Parameters<
    F extends (...args: infer Args) => unknown
        ? (
              ...args: {
                  [K in keyof Args]: K extends keyof T2 ? T2[K] : Args[K];
              }
          ) => unknown
        : never
>;
export type MergeTuple = <T extends unknown[], T2 extends unknown[]>(origin: T, current: T2) => MergedTuple<T, T2>;
export const mergeTuple: MergeTuple = (a, b) => {
    for (let i = 0, len = b.length; i < len; i++) {
        a[i] = b[i];
    }
    return a;
};
