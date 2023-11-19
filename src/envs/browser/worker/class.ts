import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/class/worker';

export { createPointer, fromMasterInstance, type IPointer } from '../../../types/class/worker';

export const define = defineCommon as DefineModuleTableExport<Transferable>;

export const expose = exposeCommon as ExposeModuleTable<Transferable>;
