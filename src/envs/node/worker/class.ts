import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/class/worker';
import type { TransferListItem } from 'worker_threads';

export {
    createPointer as pointerify,
    fromPointer as serializePointer,
    type IPointer,
} from '../../../types/class/worker';

export const define: DefineModuleTableExport<TransferListItem> = defineCommon;

export const expose: ExposeModuleTable<TransferListItem> = exposeCommon as ExposeModuleTable<TransferListItem>;
