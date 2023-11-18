import type { IWorkerRuntime, UnsubscribeFn } from './declare';
import type * as F from '../fn/worker';
import * as C from '../class/worker';
import { type UnshiftArgs, isFunction } from '../../typeUtils';
import { EMessageResponseType } from '../message/shared';
import { EAction } from '../action';
import { ClassExportProxy } from '../class/workerShared';
import { FunctionProxy } from '../fn/workerShared';
import { Fn } from '../../type';

export interface IWorkerInitOptions {
    onUnhandledRejection?: (e: unknown) => void;
}

export interface IWorkerRuntimeOptions {
    handleError?: <T>(e: unknown) => T;
}

export interface IWorkerOptions extends IWorkerInitOptions, IWorkerRuntimeOptions {}

export type WorkerImplementation<TransferableObject = unknown> = (
    options: IWorkerInitOptions,
) => IWorkerRuntime<TransferableObject>;

export type DefineWorkerExpose<TransferableObject = unknown> = <
    T extends Record<string, C.ExposedModuleTable<TransferableObject> | F.ExposedModuleTable<TransferableObject>>,
>(
    exposed: T,
    options?: IWorkerOptions,
) => void;

const strictGetNs = <T extends object, TKey extends keyof T>(exposed: T, ns: TKey): T[TKey] => {
    if (ns in exposed) {
        return exposed[ns];
    }
    throw new ReferenceError(`namespace(${ns as string}) of worker exposed is not existed`);
};
const strictGetCtor = <T extends object, TKey extends keyof T>(exposed: T, ctor: TKey): T[TKey] => {
    if (ctor in exposed) {
        return exposed[ctor];
    }
    throw new ReferenceError(`class(${ctor as string}) is not exposed`);
};
const strictGetFn = <T extends object, TKey extends keyof T>(exposed: T, fnName: TKey): T[TKey] => {
    if (fnName in exposed) {
        return exposed[fnName];
    }
    throw new ReferenceError(`function(${fnName as string}) is not exposed`);
};
let unsubscribeFn!: UnsubscribeFn | undefined;
export const defineWorkerExpose: UnshiftArgs<DefineWorkerExpose, [workerImpl: WorkerImplementation]> = async (
    workerImpl,
    exposed,
    options = {},
) => {
    if (unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = undefined;
    }
    const runtime = workerImpl(options);
    const handleError = isFunction(options.handleError) ? options.handleError : (e: unknown) => e;
    unsubscribeFn = runtime.subscribeToMasterMessages(async (messageData) => {
        const { id, data } = messageData;
        try {
            let ret: unknown;
            let transferList!: unknown[] | undefined;

            switch (data.type) {
                case EAction.CONSTRUCT: {
                    const exposeClass = strictGetCtor(
                        strictGetNs(exposed, data.ns),
                        data.ctor as string,
                    ) as C.ExposedModuleTableItem;
                    let args = data.args;
                    const proxy = exposeClass.scope.proxy as ClassExportProxy;
                    if (proxy.construct) {
                        args = proxy.construct(args);
                    }
                    ret = C.createPointer(exposeClass.ctor, new exposeClass.ctor(...args));
                    break;
                }
                case EAction.CALL: {
                    // call instance function
                    if (data.ptr) {
                        const scope = C.getScopeById(data.ptr.rawType);
                        if (scope === null) {
                            throw new ReferenceError(`Pointer type(${data.ptr.rawType}) is not exposed.`);
                        }
                        const instance = scope.fromPtr(data.ptr.rawPtr);
                        if (!instance) {
                            throw new ReferenceError(`Pointer is not existed`);
                        }
                        if (!instance[data.fnName]) {
                            throw new TypeError(`(intermediate value).${data.fnName as string} is not a function`);
                        }
                        const functionProxy = scope.proxy.instance?.[data.fnName as string];
                        if (functionProxy) {
                            const [result, transferItemList] = await functionProxy((...args: unknown[]) =>
                                instance[data.fnName](...args),
                            )(...data.args);
                            ret = result;
                            transferList = transferItemList;
                        } else {
                            ret = await instance[data.fnName](...data.args);
                        }
                        break;
                    }
                    // call static function
                    if (data.ctor) {
                        const exposeClass = strictGetCtor(
                            strictGetNs(exposed, data.ns),
                            data.ctor as string,
                        ) as C.ExposedModuleTableItem;
                        if (!isFunction(exposeClass.ctor[data.fnName])) {
                            throw new TypeError(`${data.ctor as string}.${data.fnName} is not a function`);
                        }
                        const functionProxy = exposeClass.scope.proxy.static?.[data.fnName] as unknown as FunctionProxy<
                            unknown,
                            Fn
                        >;
                        if (functionProxy) {
                            const [result, transferItemList] = await functionProxy(exposeClass.ctor[data.fnName])(
                                ...(data.args as unknown[]),
                            );
                            ret = result;
                            transferList = transferItemList;
                        } else {
                            ret = await (exposeClass.ctor[data.fnName] as Fn)(...(data.args as unknown[]));
                        }
                        break;
                    }
                    const exposeFunction = strictGetFn(
                        strictGetNs(exposed, data.ns),
                        data.fnName as string,
                    ) as F.ExposedModuleTableItem;
                    if (!isFunction(exposeFunction.value)) {
                        throw new TypeError(`${data.ns}(dynamic exposed).${data.fnName as string} is not a function`);
                    }
                    const functionProxy = exposeFunction.proxy;
                    // call plain function
                    if (functionProxy) {
                        const [result, transferItemList] = await functionProxy(exposeFunction.value)(
                            ...(data.args as unknown[]),
                        );
                        ret = result;
                        transferList = transferItemList;
                    } else {
                        ret = await exposeFunction.value(...(data.args as unknown[]));
                    }
                    break;
                }
                case EAction.FREE: {
                    const scope = C.getScopeById(data.ptr.rawType);
                    if (scope) {
                        ret = await scope.freePtr(data.ptr.rawPtr);
                    } else {
                        ret = false;
                    }
                    break;
                }
            }
            runtime.postMessageToMaster(
                {
                    type: EMessageResponseType.CALLBACK,
                    id,
                    success: true,
                    data: ret,
                },
                transferList,
            );
        } catch (e) {
            runtime.postMessageToMaster({
                type: EMessageResponseType.CALLBACK,
                id,
                success: false,
                error: handleError(e),
            });
        }
    });
};
