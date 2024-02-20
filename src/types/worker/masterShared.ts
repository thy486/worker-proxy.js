import { MessageFactory } from '../message/declare';
import { EMessageResponseType } from '../message/shared';
import { IMasterRuntime, UnsubscribeFn } from './declare';

export const createMessageFactory = <TransferableObject>(
    runtime: IMasterRuntime<TransferableObject>,
): {
    msg: MessageFactory<TransferableObject>;
    unsubscribe: UnsubscribeFn;
    resolvers: Map<number, (value: unknown) => void>;
    rejecters: Map<number, (value: unknown) => void>;
} => {
    let callerId = 0;
    const freedId: number[] = [];
    const resolvers = new Map<number, (value: unknown) => void>();
    const rejecters = new Map<number, (reason: unknown) => void>();

    const unsubscribeFn = runtime.subscribeToWorkerMessages((data) => {
        switch (data.type) {
            case EMessageResponseType.CALLBACK: {
                const id = data.id;

                if (data.success) {
                    const resolver = resolvers.get(id);

                    if (resolver) {
                        resolver(data.data);
                        return;
                    }
                } else {
                    const rejecter = rejecters.get(id);

                    if (rejecter) {
                        rejecter(data.error);
                        return;
                    }
                }
                // worker terminal
                console.error(`[task(${id})]: Worker callback can't be found!`);
                break;
            }
            case EMessageResponseType.EVENT: {
                throw new Error('Event message is not supported now');
            }
        }
    });

    const msgSender = ((value, transferList) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        let callId: number;
        if (freedId.length > 0) {
            callId = freedId.pop()!;
        } else {
            callId = callerId;
            callerId += 1;
        }

        const deferTask = (): void => {
            // clear callId
            rejecters.delete(callId);
            resolvers.delete(callId);
            freedId.push(callId);
        };
        const result = new Promise<unknown>((resolve, reject) => {
            resolvers.set(callId, resolve);
            rejecters.set(callId, reject);

            runtime.postMessageToWorker(
                {
                    id: callId,
                    data: value,
                },
                transferList,
            );
        });
        result.then(deferTask, deferTask);
        return result;
    }) as MessageFactory<TransferableObject>;

    return {
        msg: msgSender,
        unsubscribe: unsubscribeFn,
        resolvers,
        rejecters,
    };
};
