export type Fn = (...args: any) => any;
export type ClassType = new (...args: any) => any;
export type Promisable<T> = T | Promise<T>;

export type InstancePropertyTable<T extends ClassType, TInstance extends InstanceType<T> = InstanceType<T>> = {
    [K in keyof TInstance]: TInstance[K];
};
export type StaticPropertyTable<T extends ClassType> = {
    [K in keyof T as K extends 'prototype' ? never : K]: T[K];
};
export type FunctionTable<TPropertyTable> = {
    [K in keyof TPropertyTable as TPropertyTable[K] extends Fn ? K : never]: TPropertyTable[K] extends Fn
        ? TPropertyTable[K]
        : never;
};

export type ConstructorTypeCustom<TArgs extends any[], TResult> = new (...args: TArgs) => TResult;

export type ConstructorFunctionType<
    T extends ClassType,
    TArgs extends ConstructorParameters<T> = ConstructorParameters<T>,
    TResult extends InstanceType<T> = InstanceType<T>,
> = (...args: TArgs) => TResult;

export type FunctionToConstructorType<
    T extends Fn,
    TArgs extends Parameters<T> = Parameters<T>,
    TResult extends ReturnType<T> = ReturnType<T>,
> = ConstructorTypeCustom<TArgs, TResult>;

export type ConstructorType<
    T extends ClassType,
    TArgs extends any[] = ConstructorParameters<T>,
    TResult = InstanceType<T>,
> = ConstructorTypeCustom<TArgs, TResult>;
