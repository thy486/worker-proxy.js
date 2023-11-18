export interface IClassDefineOptions<S = unknown, I = unknown, C = unknown> {
    static?: S;
    instance?: I;
    construct?: C;
}

export interface IClassDefineRequiredOptions<S = unknown, I = unknown, C = unknown> {
    static: S;
    instance: I;
    construct: C;
}
