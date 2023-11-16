import type { ClassType, ConstructorType, Fn, StaticPropertyTable } from './type';

export type Prettify<T> = NonNullable<{
    [K in keyof T as T[K] extends never ? never : K]: T[K];
}>;

export type UnshiftArgs<T extends (...args: any) => any, TArgs extends any[]> = (
    ...args: [...TArgs, ...args: Parameters<T>]
) => ReturnType<T>;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type EqualToDefault<T, D> = Equal<T, D> extends true ? D : T;

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
export type PhantomType<T, PhantomKey extends symbol, PhantomType> = T & PhantomData<PhantomKey, PhantomType>;
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
