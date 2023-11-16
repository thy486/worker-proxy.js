import type { ClassType, FunctionTable, InstancePropertyTable, StaticPropertyTable } from '../type';
import type { IPointer } from './class/worker';
import type * as F from './fn/worker';
import type * as C from './class/worker';
export enum EAction {
    CONSTRUCT,
    CALL,
    FREE,
}
export interface IActionData {
    type: EAction;
}

export interface INamespaceData {
    ns: string;
}
export interface IActionData {
    type: EAction;
}

export interface ICallPlainFunctionData<
    T extends F.ExposedModuleTable<any, any>,
    TKeys extends keyof T = keyof T,
    TArgs extends Parameters<T[TKeys]['value']> = Parameters<T[TKeys]['value']>,
> extends IActionData,
        INamespaceData {
    type: EAction.CALL;
    fnName: TKeys;
    args: TArgs;
    ptr?: never;
    ctor?: never;
}

export interface ICallClassInstanceFunctionData<
    T extends ClassType,
    TInstanceTable extends FunctionTable<InstancePropertyTable<T>> = FunctionTable<InstancePropertyTable<T>>,
    TKeys extends keyof TInstanceTable = keyof TInstanceTable,
> extends IActionData {
    type: EAction.CALL;
    fnName: TKeys;
    args: Parameters<TInstanceTable[TKeys]>;
    ptr: IPointer<InstanceType<T>>;
    ctor?: never;
}
export interface ICallClassStaticFunctionData<
    T extends C.ExposedModuleTable<any, any>,
    TKeys extends keyof T = keyof T,
    TCtor extends T[TKeys]['ctor'] = T[TKeys]['ctor'],
    TStaticTable extends FunctionTable<StaticPropertyTable<TCtor>> = FunctionTable<StaticPropertyTable<TCtor>>,
    TStaticKeys extends keyof TStaticTable = keyof TStaticTable,
> extends IActionData,
        INamespaceData {
    type: EAction.CALL;
    fnName: TStaticKeys;
    args: Parameters<TStaticTable[TStaticKeys]>;
    ptr?: never;
    ctor: TKeys;
}
export interface IConstructData<T extends C.ExposedModuleTable<any, any>, TKeys extends keyof T = keyof T>
    extends IActionData,
        INamespaceData {
    type: EAction.CONSTRUCT;
    ctor: TKeys;
    args: Parameters<T[TKeys]['ctor']>;
}

export interface IFreePtrData<T> extends IActionData {
    type: EAction.FREE;
    ptr: IPointer<T>;
}

export type CommonActionData =
    | IConstructData<any>
    | ICallPlainFunctionData<any>
    | ICallClassInstanceFunctionData<any>
    | ICallClassStaticFunctionData<any>
    | IFreePtrData<any>;
