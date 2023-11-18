import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/fn/worker';
import type { TransferListItem } from 'worker_threads';

export const define: DefineModuleTableExport<TransferListItem> = defineCommon;

export const expose: ExposeModuleTable<TransferListItem> = exposeCommon;
export type {
    DefineModuleTableExport,
    ExposeModuleTable,
};
