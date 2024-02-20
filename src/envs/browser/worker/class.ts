import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/class/worker';
export type * from '../../../types/class/worker';
export { createPointer, fromMasterInstance } from '../../../types/class/worker';

export type { DefineModuleTableExport, ExposeModuleTable };

export const define = defineCommon as DefineModuleTableExport<Transferable>;
export const expose = exposeCommon as ExposeModuleTable<Transferable>;
