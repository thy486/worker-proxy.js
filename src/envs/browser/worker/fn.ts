import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/fn/worker';

export type { DefineModuleTableExport, ExposeModuleTable };

export const define: DefineModuleTableExport<Transferable> = defineCommon;
export const expose: ExposeModuleTable<Transferable> = exposeCommon;
