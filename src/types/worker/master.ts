import type * as F from '../fn/worker';
import type * as C from '../class/worker';
import {
    type CreateClassSpawn,
    type CreatePointerSpawn,
    type Free,
    createClassSpawn,
    createPointerSpawn,
    free,
} from '../class/master';
import { type CreateFunctionSpawn, createFunctionSpawn } from '../fn/master';
import { type Promisable } from '../../type';
import { type UnshiftArgs, isFunction, mergeVoidFunction } from '../../typeUtils';
import type { IClassContext } from '../class/masterShared';
import type { IMasterRuntime, UnsubscribeFn } from './declare';
import { EMessageResponseType } from '../message/shared';
import type { MessageFactory } from '../message/declare';

export interface IMasterInitOptions {
    onExit?: (exitCode?: number) => void;
    handleError?: <T>(e: any) => T;
}

export interface IMasterRuntimeOptions {
    handleError?: <T>(e: any) => T;
}
export interface IWorkerOptions extends IMasterInitOptions, IMasterRuntimeOptions {}
interface IMasterSpawnRuntime<
    TransferableObject,
    T extends Record<
        string,
        C.ExposedModuleTable<TransferableObject> | F.ExposedModuleTable<TransferableObject>
    > = Record<string, C.ExposedModuleTable<TransferableObject> | F.ExposedModuleTable<TransferableObject>>,
    TFunctionSpawn extends Record<string, F.ExposedModuleTable<TransferableObject, any>> = {
        [K in keyof T as T[K] extends F.ExposedModuleTable<TransferableObject>
            ? K
            : never]: T[K] extends F.ExposedModuleTable<TransferableObject> ? T[K] : never;
    },
    TClassSpawn extends Record<string, C.ExposedModuleTable<TransferableObject>> = {
        [K in keyof T as T[K] extends C.ExposedModuleTable<TransferableObject>
            ? K
            : never]: T[K] extends C.ExposedModuleTable<TransferableObject> ? T[K] : never;
    },
> {
    spawnFunction: CreateFunctionSpawn<TransferableObject, TFunctionSpawn>;
    spawnClass: CreateClassSpawn<TransferableObject, TClassSpawn>;
    deserializePointer: CreatePointerSpawn<TransferableObject, TClassSpawn>;
    free: Free<TransferableObject, TClassSpawn>;
}

export type MasterImplementation<TransferableObject, T> = (
    worker: T,
    options: IMasterInitOptions,
) => Promisable<IMasterRuntime<TransferableObject>>;

export type CreateMasterSpawn<TransferableObject, TWorker> = <
    T extends Record<string, C.ExposedModuleTable<TransferableObject> | F.ExposedModuleTable<TransferableObject>>,
>(
    worker: TWorker,
    options?: IWorkerOptions,
) => Promise<IMasterSpawnRuntime<TransferableObject, T>>;

let unsubscribeFn!: UnsubscribeFn | undefined;
export const createMasterSpawn: UnshiftArgs<
    CreateMasterSpawn<any, any>,
    [masterImpl: MasterImplementation<any, any>]
> = async (masterImpl, worker, options = {}) => {
    if (unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = undefined;
    }
    const runtime = await masterImpl(worker, options);
    let callerId = 0;
    const freedId: number[] = [];
    const resolvers = new Map<number, (value: any) => void>();
    const rejecters = new Map<number, (reason: any) => void>();
    const finallyTasks: Array<() => void> = [];
    const wrapError = isFunction(options.handleError) ? (e: any): any => options.handleError!(e) : <T>(e: T): T => e;
    const execFinalTasks = (): void => {
        for (const task of finallyTasks) {
            try {
                task();
            } catch (e) {
                console.warn(e);
            }
        }
        finallyTasks.length = 0;
    };
    const handleError = (err: any): void => {
        for (const rejecter of rejecters.values()) {
            rejecter(wrapError(err));
        }
        execFinalTasks();
    };
    unsubscribeFn = runtime.subscribeToWorkerMessages((data) => {
        switch (data.type) {
        case EMessageResponseType.CALLBACK: {
            const id = data.id;
            const resolver = resolvers.get(id);
            const rejecter = rejecters.get(id);

            if (resolver && rejecter) {
                if (data.success) {
                    resolver(data.data);
                    execFinalTasks();
                    return;
                }
                rejecter(wrapError(data.error));
            }
            // worker terminal
            else {
                console.error('Worker is been stoped!');
            }
            execFinalTasks();
            break;
        }
        case EMessageResponseType.EVENT: {
            throw new Error('Event function is not supported now');
        }
        }
    });
    unsubscribeFn = mergeVoidFunction(unsubscribeFn, runtime.subscribeToWorkerError(handleError));
    if (isFunction(options.onExit)) {
        unsubscribeFn = mergeVoidFunction(
            unsubscribeFn,
            runtime.subscribeToWorkerClose((exitCode) => {
                options.onExit!(exitCode);
                handleError(exitCode);
            }),
        );
    } else {
        unsubscribeFn = mergeVoidFunction(unsubscribeFn, runtime.subscribeToWorkerClose(handleError));
    }
    const msgSender: MessageFactory<any> = (value, transferList) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        let _callId: number;
        if (freedId.length > 0) {
            _callId = freedId.pop()!;
        } else {
            _callId = callerId;
            callerId += 1;
        }

        const deferTask = (): void => {
            // clear callId
            rejecters.delete(_callId);
            resolvers.delete(_callId);
            freedId.push(_callId);
        };
        const result = new Promise<any>((resolve, reject) => {
            resolvers.set(_callId, resolve);
            rejecters.set(_callId, reject);

            runtime.postMessageToWorker(
                {
                    id: _callId,
                    data: value,
                },
                transferList,
            );
        });
        result.then(deferTask, deferTask);
        return result;
    };
    const classContext: IClassContext = { GLOBAL_CLASS_OPTION_STORE: {} };
    return {
        spawnClass: (ns, options) => createClassSpawn(msgSender, classContext, ns, options) as any,
        spawnFunction: (ns, options) => createFunctionSpawn(msgSender, ns, options as any) as any,
        deserializePointer: (ns, ctorKey, pointer) =>
            createPointerSpawn(msgSender, classContext, ns, ctorKey, pointer as any) as any,
        free: (instance) => free(msgSender, classContext, instance as any) as any,
    };
};