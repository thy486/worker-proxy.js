import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/fn/worker';

export const define: DefineModuleTableExport<Transferable> = defineCommon;

export const expose: ExposeModuleTable<Transferable> = exposeCommon;
export type {
    DefineModuleTableExport,
    ExposeModuleTable,
};
