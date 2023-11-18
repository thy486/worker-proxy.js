/* eslint-disable @typescript-eslint/no-explicit-any */
export type Fn = (...args: any) => any;
export type ClassType = new (...args: any) => any;
export type PromiseOrValue<T> = T | Promise<T>;

export type InstancePropertyTable<T extends ClassType, TInstance extends InstanceType<T> = InstanceType<T>> = {
    [K in keyof TInstance]: TInstance[K];
};
export type StaticPropertyTable<T extends ClassType> = {
    [K in keyof T as K extends 'prototype' ? never : K]: T[K];
};
export type FunctionTable<TPropertyTable> = {
    [K in keyof TPropertyTable as TPropertyTable[K] extends Fn ? K : never]: TPropertyTable[K] extends Fn
        ? TPropertyTable[K]
        : Fn;
};

export type ConstructorTypeCustom<TArgs extends any[] = any[], TResult = any> = new (...args: TArgs) => TResult;
export type ConstructorFunctionType<
    T extends ClassType,
> = (...args: ConstructorParameters<T>) => InstanceType<T>;

export type FunctionToConstructorType<
    T extends Fn = Fn,
> = ConstructorTypeCustom<Parameters<T>, ReturnType<T>,>;

export type ConstructorType<
    T extends ClassType = ClassType,
    TArgs extends never[] = ConstructorParameters<T>,
    TResult = InstanceType<T>,
> = ConstructorTypeCustom<TArgs, TResult>;
