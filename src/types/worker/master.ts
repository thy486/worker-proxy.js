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
import { FilterDict, type PromiseOrValue } from '../../shared/type';
import { type UnshiftArgs, isFunction, mergeVoidFunction } from '../../shared/typeUtils';
import type { IClassContext } from '../class/masterShared';
import type { IMasterRuntime, UnsubscribeFn } from './declare';
import type { MessageFactory } from '../message/declare';
import { WorkerExposedValue } from './worker';
import { createMessageFactory } from './masterShared';

export interface IMasterInitOptions {
    onExit?: (exitCode?: number) => void;
    handleError?: <T>(e: unknown) => T;
}

export interface IMasterRuntimeOptions {
    handleError?: <T>(e: unknown) => T;
}
export interface IWorkerOptions extends IMasterInitOptions, IMasterRuntimeOptions {}
export interface IMasterSpawnRuntime<
    TransferableObject,
    T extends WorkerExposedValue<TransferableObject> = WorkerExposedValue<TransferableObject>,
    TFunctionSpawn extends Record<string, F.ExposedModuleTable<TransferableObject>> = FilterDict<
        T,
        Record<string, F.ExposedModuleTable<TransferableObject>>
    >,
    TClassSpawn extends Record<string, C.ExposedModuleTable<TransferableObject>> = FilterDict<
        T,
        Record<string, C.ExposedModuleTable<TransferableObject>>
    >,
> {
    spawnFunction: CreateFunctionSpawn<TransferableObject, TFunctionSpawn>;
    spawnClass: CreateClassSpawn<TransferableObject, TClassSpawn>;
    deserializePointer: CreatePointerSpawn<TransferableObject, TClassSpawn>;
    serializePointer: SerializeToPointer<TransferableObject, TClassSpawn>;
    free: Free<TransferableObject, TClassSpawn>;
    /**
     * @desc danger
     *
     * If tasks were not finished, it will make forever pending tasks.
     */
    despawn: UnsubscribeFn;
}

export type MasterImplementation<TransferableObject = unknown, TWorker = unknown> = (
    worker: TWorker,
    options: IMasterInitOptions,
) => PromiseOrValue<IMasterRuntime<TransferableObject>>;

export type CreateMasterSpawn<TransferableObject, TWorker> = <T extends WorkerExposedValue<TransferableObject>>(
    worker: TWorker,
    options?: IWorkerOptions,
) => Promise<IMasterSpawnRuntime<TransferableObject, T>>;

export type CreateMasterSpawnFunc = UnshiftArgs<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CreateMasterSpawn<any, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [masterImpl: MasterImplementation<any, any>]
>;
export abstract class MasterSpawnAbstractClass<
    TransferableObject,
    T extends WorkerExposedValue<TransferableObject>,
    TFunctionSpawn extends Record<string, F.ExposedModuleTable<TransferableObject>> = FilterDict<
        T,
        Record<string, F.ExposedModuleTable<TransferableObject>>
    >,
    TClassSpawn extends Record<string, C.ExposedModuleTable<TransferableObject>> = FilterDict<
        T,
        Record<string, C.ExposedModuleTable<TransferableObject>>
    >,
> implements IMasterSpawnRuntime<TransferableObject, T>
{
    public constructor(
        protected _masterImpl: MasterImplementation,
        protected _options?: IWorkerOptions,
    ) {}

    public abstract spawnFunction: CreateFunctionSpawn<TransferableObject, TFunctionSpawn>;
    public abstract spawnClass: CreateClassSpawn<TransferableObject, TClassSpawn>;
    public abstract deserializePointer: CreatePointerSpawn<TransferableObject, TClassSpawn>;
    public abstract serializePointer: SerializeToPointer<TransferableObject, TClassSpawn>;
    public abstract free: Free<TransferableObject, TClassSpawn>;
    public abstract despawn: UnsubscribeFn;
}

export const createMasterSpawn: CreateMasterSpawnFunc = async (masterImpl, worker, options = {}) => {
    let unsubscribeFn: UnsubscribeFn | undefined = undefined;
    const runtime = await masterImpl(worker, options);
    const wrapError = isFunction(options.handleError) ? (e: unknown) => options.handleError!(e) : <T>(e: T): T => e;
    const handleError = (err: unknown): void => {
        for (const rejecter of rejecters.values()) {
            rejecter(wrapError(err));
        }
    };
    const { msg, unsubscribe, rejecters } = createMessageFactory(runtime);
    unsubscribeFn = unsubscribe;
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
    const msgSender: MessageFactory<unknown> = (value, transferList) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        msg(value, transferList).catch(wrapError) as any;
    const classContext: IClassContext = { GLOBAL_CLASS_OPTION_STORE: {} };
    return {
        spawnClass: (ns, options) => createClassSpawn(msgSender, classContext, ns, options),
        spawnFunction: (ns, options) => createFunctionSpawn(msgSender, ns, options),
        deserializePointer: (ns, ctorKey, pointer) =>
            createPointerSpawn(msgSender, classContext, ns, ctorKey as string, pointer),
        serializePointer: serializeToPointer,
        free: (instance) => free(msgSender, classContext, instance as never),
        despawn: unsubscribeFn,
    } as IMasterSpawnRuntime<unknown, Record<string, C.ExposedModuleTable<unknown> | F.ExposedModuleTable<unknown>>>;
};
