export { expose as exposeFunctionTable, define as defineFunctionExpose } from './fn';
export { expose as exposeClassTable, define as defineClassExpose, createPointer, fromMasterInstance } from './class';
export * as Fn from './fn';
export * as Class from './class';
export { expose } from './worker';
