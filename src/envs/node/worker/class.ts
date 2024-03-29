import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/class/worker';
import type { TransferListItem } from 'worker_threads';
export type * from '../../../types/class/worker';
export { createPointer, fromMasterInstance } from '../../../types/class/worker';

export type { DefineModuleTableExport, ExposeModuleTable };

export const define: DefineModuleTableExport<TransferListItem> = defineCommon;

export const expose: ExposeModuleTable<TransferListItem> = exposeCommon as ExposeModuleTable<TransferListItem>;
