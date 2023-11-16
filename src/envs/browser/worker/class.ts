import {
    type DefineModuleTableExport,
    type ExposeModuleTable,
    define as defineCommon,
    expose as exposeCommon,
} from '../../../types/class/worker';

export { createPointer as pointerify, fromPointer as serializePointer, type IPointer } from '../../../types/class/worker';

export const define: DefineModuleTableExport<Transferable> = defineCommon;

export const expose: ExposeModuleTable<Transferable> = exposeCommon;
