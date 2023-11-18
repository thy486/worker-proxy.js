import type * as F from '../fn/worker';
import type * as C from '../class/worker';
import {
    type CreateClassSpawn,
    type CreatePointerSpawn,
    type Free,
    createClassSpawn,
    createPointerSpawn,
    free,
    SerializeToPointer,
    serializeToPointer,
} from '../class/master';
import { type CreateFunctionSpawn, createFunctionSpawn } from '../fn/master';
import { type PromiseOrValue } from '../../type';
import { type UnshiftArgs, isFunction, mergeVoidFunction } from '../../typeUtils';
import type { IClassContext } from '../class/masterShared';
import type { IMasterRuntime, UnsubscribeFn } from './declare';
import { EMessageResponseType } from '../message/shared';
import type { MessageFactory } from '../message/declare';

export interface IMasterInitOptions {
    onExit?: (exitCode?: number) => void;
    handleError?: <T>(e: unknown) => T;
}

export interface IMasterRuntimeOptions {
    handleError?: <T>(e: unknown) => T;
}
export interface IWorkerOptions extends IMasterInitOptions, IMasterRuntimeOptions {}
interface IMasterSpawnRuntime<
    TransferableObject,
    T extends Record<
        string,
        C.ExposedModuleTable<TransferableObject> | F.ExposedModuleTable<TransferableObject>
    > = Record<string, C.ExposedModuleTable<TransferableObject> | F.ExposedModuleTable<TransferableObject>>,
    TFunctionSpawn extends Record<string, F.ExposedModuleTable<TransferableObject>> = {
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
    serializePointer: SerializeToPointer<TransferableObject, TClassSpawn>;
    free: Free<TransferableObject, TClassSpawn>;
}

export type MasterImplementation<TransferableObject = unknown, TWorker = unknown> = (
    worker: TWorker,
    options: IMasterInitOptions,
) => PromiseOrValue<IMasterRuntime<TransferableObject>>;

export type CreateMasterSpawn<TransferableObject = unknown, TWorker = unknown> = <
    T extends Record<string, C.ExposedModuleTable<TransferableObject> | F.ExposedModuleTable<TransferableObject>>,
>(
    worker: TWorker,
    options?: IWorkerOptions,
) => Promise<IMasterSpawnRuntime<TransferableObject, T>>;

let unsubscribeFn!: UnsubscribeFn | undefined;
export const createMasterSpawn: UnshiftArgs<CreateMasterSpawn, [masterImpl: MasterImplementation]> = async (
    masterImpl,
    worker,
    options = {},
) => {
    if (unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = undefined;
    }
    const runtime = await masterImpl(worker, options);
    let callerId = 0;
    const freedId: number[] = [];
    const resolvers = new Map<number, (value: unknown) => void>();
    const rejecters = new Map<number, (reason: unknown) => void>();
    const finallyTasks: Array<() => void> = [];
    const wrapError = isFunction(options.handleError) ? (e: unknown) => options.handleError!(e) : <T>(e: T): T => e;
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
    const handleError = (err: unknown): void => {
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
    const msgSender: MessageFactory = ((value, transferList) => {
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
        const result = new Promise<unknown>((resolve, reject) => {
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
    }) as MessageFactory;
    const classContext: IClassContext = { GLOBAL_CLASS_OPTION_STORE: {} };
    return {
        spawnClass: (ns, options) => createClassSpawn(msgSender, classContext, ns, options),
        spawnFunction: (ns, options) => createFunctionSpawn(msgSender, ns, options),
        deserializePointer: (ns, ctorKey, pointer) => createPointerSpawn(msgSender, classContext, ns, ctorKey as string, pointer),
        serializePointer: serializeToPointer,
        free: (instance) => free(msgSender, classContext, instance as never),
    } as IMasterSpawnRuntime<unknown, Record<string, C.ExposedModuleTable<unknown> | F.ExposedModuleTable<unknown>>>;
};
