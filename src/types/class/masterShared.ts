import type { Fn } from '../../type';
import type { UnshiftArgs } from '../../typeUtils';
import type { WithMessageSender } from '../message/declare';
import type * as C from './master';

export interface IClassContext {
    GLOBAL_CLASS_OPTION_STORE: Record<string, C.DefineClassSpawnOptions>;
}

export type ClassImpl<TransferableObject, T extends Fn> = WithMessageSender<
    TransferableObject,
    UnshiftArgs<T, [context: IClassContext]>
>;
